pipeline {
    agent any
    
    stages {
        stage('Clone Repository') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup Environment Variables') {
            steps {
                sh '''
                    cp apps/frontend/.env.example apps/frontend/.env
                    cp apps/backend/.env.example apps/backend/.env
                    
                    
                    sed -i 's|http://localhost:3000|http://YOUR_EC2_IP:3002|g' apps/frontend/.env
                    sed -i 's|localhost:5433|postgres:5432|g' apps/backend/.env
                '''
            }
        }
        
        stage('Build & Deploy Containers') {
            steps {
                sh 'docker-compose down'
                sh 'docker-compose up -d --build'
            }
        }
        
        stage('Sync Database') {
            steps {
                sh 'sleep 10'
                sh 'docker-compose exec -T backend npx prisma db push'
            }
        }
    }
}
