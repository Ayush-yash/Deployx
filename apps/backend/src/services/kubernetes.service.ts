import * as k8s from '@kubernetes/client-node';
import * as yaml from 'js-yaml';

export class KubernetesService {
  private kc: k8s.KubeConfig;
  private coreV1Api: k8s.CoreV1Api;
  private appsV1Api: k8s.AppsV1Api;
  private netV1Api: k8s.NetworkingV1Api;

  constructor(kubeconfigStr: string) {
    this.kc = new k8s.KubeConfig();
    try {
      this.kc.loadFromString(kubeconfigStr);
    } catch (e) {
      console.warn('Failed to parse kubeconfig string. Falling back to default/local config.', e);
      this.kc.loadFromDefault();
    }
    this.coreV1Api = this.kc.makeApiClient(k8s.CoreV1Api);
    this.appsV1Api = this.kc.makeApiClient(k8s.AppsV1Api);
    this.netV1Api = this.kc.makeApiClient(k8s.NetworkingV1Api);
  }

  static fromLocal(): KubernetesService {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    return new KubernetesService(kc.exportConfig());
  }

  async getPods(namespace: string, labelSelector: string) {
    try {
      const res: any = await (this.coreV1Api as any).listNamespacedPod(namespace, undefined, undefined, undefined, undefined, labelSelector);
      const items = res?.body?.items || res?.items || [];
      return items.map((pod: any) => ({
        name: pod.metadata?.name,
        status: pod.status?.phase,
        restarts: pod.status?.containerStatuses?.[0]?.restartCount || 0,
        createdAt: pod.metadata?.creationTimestamp,
        node: pod.spec?.nodeName
      }));
    } catch (error) {
      console.error('Error fetching pods:', error);
      return [];
    }
  }

  generateManifests(namespace: string, name: string, image: string, port: number, env: Record<string, string>) {
    const envVars = Object.entries(env).map(([key, value]) => ({ name: key, value: value || '' }));

    const deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name, namespace, labels: { app: name } },
      spec: {
        replicas: 1,
        selector: { matchLabels: { app: name } },
        template: {
          metadata: { labels: { app: name } },
          spec: {
            containers: [
              {
                name,
                image,
                ports: [{ containerPort: port }],
                env: envVars,
                imagePullPolicy: 'IfNotPresent'
              }
            ]
          }
        }
      }
    };

    const service = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name, namespace, labels: { app: name } },
      spec: {
        selector: { app: name },
        ports: [{ port: port, targetPort: port }],
        type: 'ClusterIP'
      }
    };

    const deploymentYaml = yaml.dump(deployment, { noRefs: true });
    const serviceYaml = yaml.dump(service, { noRefs: true });

    return { deploymentYaml, serviceYaml };
  }



  async scaleDeployment(namespace: string, name: string, replicas: number) {
    const patch = [{ op: 'replace', path: '/spec/replicas', value: replicas }];
    const options = { headers: { 'Content-type': 'application/json-patch+json' } };
    await (this.appsV1Api as any).patchNamespacedDeployment(name, namespace, patch, undefined, undefined, undefined, undefined, options);
  }

  async restartDeployment(namespace: string, name: string) {
    const patch = [{
      op: 'add',
      path: '/spec/template/metadata/annotations/kubectl.kubernetes.io~1restartedAt',
      value: new Date().toISOString()
    }];
    const options = { headers: { 'Content-type': 'application/json-patch+json' } };
    await (this.appsV1Api as any).patchNamespacedDeployment(name, namespace, patch, undefined, undefined, undefined, undefined, options);
  }

  async deleteDeploymentAndService(namespace: string, name: string) {
    try {
      await (this.appsV1Api as any).deleteNamespacedDeployment(name, namespace);
    } catch (e) {}
    try {
      await (this.coreV1Api as any).deleteNamespacedService(name, namespace);
    } catch (e) {}
  }
}
