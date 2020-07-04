def changedFiles = []

pipeline {

    agent { label 'jenkins-bc-did' }

    options {
        disableConcurrentBuilds()
    }

    environment {
        IMAGE_TAG = "latest"
        CONTAINER_NAME = "probe-reader" // The name of of the nodjs application that will read data coming of the controller board.
        NODEJS_DOWNLOAD = "https://nodejs.org/dist/latest-v13.x/node-v13.14.0-linux-armv7l.tar.xz"
        NODEJS_DOWNLOAD_FILENAME = "node-v13.14.0-linux-armv7l.tar.xz"
        NODEJS_DOWNLOAD_DIRECTORY = "node-v13.14.0-linux-armv7l"
    }

    stages {
        stage('Deploy the nodejs controller application') {
            steps {
                script {

                    withCredentials([string(credentialsId: 'SPLUNK_URL', variable: 'SPLUNK_URL'),
                                     string(credentialsId: 'SPLUNK_TOKEN', variable: 'SPLUNK_TOKEN'),
                                     string(credentialsId: 'HUE_API_TOKEN', variable: 'HUE_API_TOKEN'),
                                     dockerCert(credentialsId: 'DOCKER_AUTH_CERTS', variable: 'LOCAL_DOCKER_CERT_PATH')]) {

                        dir("src/main/javascript/probe-reader") {

                            if (fileExists(NODEJS_DOWNLOAD_FILENAME)) {
                                println "Node js already downloaded."
                            } else {
                                sh "wget ${NODEJS_DOWNLOAD}"
                            }

                            FLAGS = "--insecure --cert ${LOCAL_DOCKER_CERT_PATH}/cert.pem --key ${LOCAL_DOCKER_CERT_PATH}/key.pem  --cacert ${LOCAL_DOCKER_CERT_PATH}/ca.pem"

                            sh """

                                ls -ltra

                                cat Dockerfile | mo > Dockerfile.tmp
                                mv Dockerfile.tmp Dockerfile
                                
                                cat deploy-container.json | mo > deploy-container.json.tmp
                                mv deploy-container.json.tmp deploy-container.json

                                docker build . -t ${REGISTRY_IP_AND_PORT}/${CONTAINER_NAME}:${IMAGE_TAG}

                                export DOCKER_HOST=tcp://${IOT_AQUAPONIC_IP_AND_DOCKER_PORT}
                                export DOCKER_TLS_VERIFY=1

                                echo $DOCKER_HOST
                                 
                                cp ${LOCAL_DOCKER_CERT_PATH}/* ~/.docker

                                docker ps
                                    
                                #curl -X POST  -H 'Content-Type: application/json' https://${IOT_AQUAPONIC_IP_AND_DOCKER_PORT}/containers/${CONTAINER_NAME}/stop ${FLAGS}
                                #curl -X DELETE https://${IOT_AQUAPONIC_IP_AND_DOCKER_PORT}/containers/${CONTAINER_NAME}?v=${IMAGE_TAG} ${FLAGS}
        
    
                                #tar -cvf controller.tar package.json package-lock.json index.js ${NODEJS_DOWNLOAD_FILENAME} Dockerfile
        
                                #curl -X POST  -H 'Content-Type: application/x-tar' --data-binary '@controller.tar' https://${IOT_AQUAPONIC_IP_AND_DOCKER_PORT}/build?t=controller:latest ${FLAGS}
                                #curl -X POST  -H 'Content-Type: application/json' --data-binary '@deploy-container.json' https://${IOT_AQUAPONIC_IP_AND_DOCKER_PORT}/containers/create?name=${CONTAINER_NAME} ${FLAGS}
                                #curl -X POST  -H 'Content-Type: application/json' https://${IOT_AQUAPONIC_IP_AND_DOCKER_PORT}/containers/${CONTAINER_NAME}/start ${FLAGS}

                              """
                        }

                    }
                }
            }
        }
    }
}
