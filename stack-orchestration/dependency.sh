#!/bin/bash

function install_dependency_prompt {

  DEPENDENCY=${1}

  while true; do

    read -p "$DEPENDENCY is required by the stack orchestration tool. Would you like to install it? [Y/n] " yn

    case $yn in
      [yY] ) echo Installing dependency...;
        if [ $DEPENDENCY = "gds-cli" ]; then
          brew install alphagov/gds/gds-cli;
        else
          brew install $DEPENDENCY;
        fi
      break;;

      [nN] ) echo exiting...;
      exit 0;;

      * ) echo invalid response, please use Y/y or N/n;;
    esac

  done

}

echo "Dependency: checking whether required packages are installed"
aws --version > /dev/null 2>&1       || install_dependency_prompt awscli
jq --version > /dev/null 2>&1        || install_dependency_prompt jq
gds --version > /dev/null 2>&1       || install_dependency_prompt gds-cli
aws-vault --version > /dev/null 2>&1 || install_dependency_prompt aws-vault

echo "Dependency: check done"
