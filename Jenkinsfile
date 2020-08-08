def changedFiles = []

pipeline {

    agent { label 'jenkins-bc-did' }

    options {
        disableConcurrentBuilds()
    }

    environment {
        IMAGE_TAG = "latest"
        CONTAINER_NAME = "probe-reader"
        // The name of of the nodjs application that will read data coming of the controller board.
        NODEJS_DOWNLOAD = "https://nodejs.org/dist/latest-v13.x/node-v13.14.0-linux-armv7l.tar.xz"
        NODEJS_DOWNLOAD_FILENAME = "node-v13.14.0-linux-armv7l.tar.xz"
        NODEJS_DOWNLOAD_DIRECTORY = "node-v13.14.0-linux-armv7l"
        INO_VALVE_CHANGED = "yes"
    }

    stages {

        stage("See what files have changed") {

            steps {
                script {

                    for (changeLogSet in currentBuild.changeSets) {
                        for (entry in changeLogSet.getItems()) { // for each commit in the detected changes
                            for (file in entry.getAffectedFiles()) {
                                changedFiles.add(file.getPath()) // add changed file to list
                            }
                        }
                    }

                    changedFiles.unique()

                    for (fileName in changedFiles) {
                        println(fileName)
                        if (fileName.contains("arduino") && fileName.contains("valve-controller")) {
                            INO_VALVE_CHANGED = "yes"
                        }
                    }
                }
            }
        }
        stage("Compile and deploy valve sketch") {
            when {
                expression {
                    INO_VALVE_CHANGED == "yes"
                }
            }
            steps {
                script {


                    env.INO = "valve-controller.ino"

                    withCredentials([dockerCert(credentialsId: 'DOCKER_AUTH_CERTS', variable: 'LOCAL_DOCKER_CERT_PATH'),
                                     usernamePassword(credentialsId: 'GITHUBUSER_TOKENPASS', usernameVariable: 'USER', passwordVariable: 'PASS')]) {

                    sh """
                        cd src/main/arduino/valve-controller

                        cat ${INO} | mo > ${INO}.tmp
                        mv -f ${INO}.tmp ${INO}

                        cat Dockerfile | mo > Dockerfile.tmp
                        cat Dockerfile.tmp | mo > Dockerfile


                        cp ${LOCAL_DOCKER_CERT_PATH}/* ~/.docker
                        export DOCKER_HOST=tcp://${IOT_AQUAPONIC_IP_AND_DOCKER_PORT}
                        export DOCKER_TLS_VERIFY=1

                        docker login docker.pkg.github.com -u ${USER} -p ${PASS}


                        
                        docker rm ino || true
                        docker build . -t ino:latest

                        curl -X POST  -H 'Content-Type: application/json' --data-binary '@deploy-container.json' http://${IOT_AQUAPONIC_IP_AND_DOCKER_PORT}/containers/create?name=ino
                        #curl -X POST  -H 'Content-Type: application/json' http://${IOT_AQUAPONIC_IP_AND_DOCKER_PORT}/containers/ino/start
                        
                    """

                        waitUntil {
                            script {

                                CONTANER_STATUS = sh(
                                        script: "curl -X GET  -H 'Content-Type: application/json' http://${IOT_AQUAPONIC_IP_AND_DOCKER_PORT}/containers/ino/json",
                                        returnStdout: true
                                ).trim()

                                def containerStatusJson = readJSON text: "${CONTANER_STATUS}"
                                println containerStatusJson.State.Status
                                if (containerStatusJson.State.Status == "exited") {
                                    return true
                                } else {
                                    return false
                                }
                            }
                        }

                    }



                    sleep(10)
                }
            }
        }

//        stage('Deploy the nodejs controller application') {
//            steps {
//                script {
//
//                    withCredentials([string(credentialsId: 'SPLUNK_URL', variable: 'SPLUNK_URL'),
//                                     string(credentialsId: 'SPLUNK_TOKEN', variable: 'SPLUNK_TOKEN'),
//                                     string(credentialsId: 'HUE_API_TOKEN', variable: 'HUE_API_TOKEN'),
//                                     dockerCert(credentialsId: 'DOCKER_AUTH_CERTS', variable: 'LOCAL_DOCKER_CERT_PATH')]) {
//
//                        dir("src/main/javascript/probe-reader") {
//
//                            if (fileExists(NODEJS_DOWNLOAD_FILENAME)) {
//                                println "Node js already downloaded."
//                            } else {
//                                sh "wget ${NODEJS_DOWNLOAD}"
//                            }
//
//                            FLAGS = "--insecure --cert ${LOCAL_DOCKER_CERT_PATH}/cert.pem --key ${LOCAL_DOCKER_CERT_PATH}/key.pem  --cacert ${LOCAL_DOCKER_CERT_PATH}/ca.pem"
//
//                            sh """
//
//                                ls -ltra
//
//                                cat Dockerfile | mo > Dockerfile.tmp
//                                mv Dockerfile.tmp Dockerfile
//
//                                cat deploy-container.json | mo > deploy-container.json.tmp
//                                mv deploy-container.json.tmp deploy-container.json
//
//                                unset DOCKER_HOST
//                                unset DOCKER_TLS_VERIFY
//
//                                docker build . -t ${REGISTRY_IP_AND_PORT}/${CONTAINER_NAME}:${IMAGE_TAG}
//                                docker push ${REGISTRY_IP_AND_PORT}/${CONTAINER_NAME}:${IMAGE_TAG}
//
//                                cp ${LOCAL_DOCKER_CERT_PATH}/* ~/.docker
//                                export DOCKER_HOST=tcp://${IOT_AQUAPONIC_IP_AND_DOCKER_PORT}
//                                export DOCKER_TLS_VERIFY=1
//
//                                docker ps
//                                docker stop ${CONTAINER_NAME} || true
//                                docker rm ${CONTAINER_NAME} || true
//                                docker pull ${REGISTRY_IP_AND_PORT}/${CONTAINER_NAME}:${IMAGE_TAG}
//
//                                # It's just easier to push the docker configuration this way.  I'm sure a compose file would be cleaner.
//                                curl -X POST  -H 'Content-Type: application/json' --data-binary '@deploy-container.json' https://${IOT_AQUAPONIC_IP_AND_DOCKER_PORT}/containers/create?name=${CONTAINER_NAME} ${FLAGS}
//
//                                docker start ${CONTAINER_NAME}
//
//                                docker system prune -f
//
//                              """
//                        }
//
//                    }
//                }
//            }
//        }
    }
}
