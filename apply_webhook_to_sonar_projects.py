"""
Script: SonarQube Webhook Setup

This script automates the process of adding a webhook to multiple projects in SonarQube using the Port service.
The webhook allows receiving notifications and triggering actions whenever a project analysis is completed in SonarQube.

Required Parameters:
    - SONAR_API_TOKEN: Your SonarQube API token for authentication.
    - SONAR_ORGANIZATION_KEY: The organization key in SonarQube.
    - PORT_API_TOKEN: Your Port API token for authentication.

Please note:
    - If you are not using SonarCloud, you may need to modify the SONAR_URL variable to match your SonarQube server URL.
    - If you have changed the webhook identifier to a value different from the one provided in the documentation, please update the PORT_WEBHOOK_IDENTIFIER variable with the correct value.

Prerequisites:
    - Install the `requests` package.

Usage:
    1. Set the required parameters in the configuration section below.
    2. Run the script.

"""
import logging

import requests

# CONFIGURATION
SONAR_URL = "https://sonarcloud.io"  # URL of SonarQube server
SONAR_API_TOKEN = "{YOUR_SONAR_API_TOKEN}"  # API token for SonarQube authentication
SONAR_ORGANIZATION_KEY = "{YOUR_SONAR_ORGANIZATION_KEY}"  # Organization key in SonarQube

PORT_URL = "https://api.getport.io"  # URL of Port service
PORT_API_TOKEN = "{YOUR_PORT_API_TOKEN}"  # API token for Port authentication
PORT_WEBHOOK_IDENTIFIER = "sonarCloudMapper"  # Identifier for the Port webhook

# Port URL
port_webhooks_endpoint = f"{PORT_URL}/v1/webhooks"

# API endpoint to get all projects in SonarQube
projects_endpoint = f"{SONAR_URL}/api/projects/search"

# API endpoint to add webhook to a SonarQube project
webhooks_endpoint = f"{SONAR_URL}/api/webhooks"

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def get_or_create_webhook_url():
    """
    Retrieves the URL of the Port webhook from the Port service or creates it if it doesn't exist.

    Returns:
        str: URL of the Port webhook
    """
    headers = {
        "Authorization": PORT_API_TOKEN
    }
    response = requests.get(f'{port_webhooks_endpoint}/{PORT_WEBHOOK_IDENTIFIER}', headers=headers)

    if not response.ok:
        if response.status_code == 404:
            logger.error('Webhook not found')
        logging.error(f'Status: {response.status_code}, Message: {response.json()}')
        response.raise_for_status()

    return response.json()['integration']['url']


def request_sonar_qube(url, method='GET', params=None, body=None):
    """
    Makes an HTTP request to the SonarQube API.

    Args:
        url (str): The API endpoint URL
        method (str): The HTTP method (default: 'GET')
        params (dict): The query parameters (default: None)
        body (dict): The request body (default: None)

    Returns:
        dict: The JSON response from the API

    Raises:
        requests.HTTPError: If the API response is not successful (status code >= 400)
    """
    params = params or {}
    body = body or {}
    response = requests.request(method, url, headers={
        "Authorization": f"Bearer {SONAR_API_TOKEN}",
        "Content-Type": "application/json",
    }, params=params, json=body)

    if not response.ok:
        logger.error(f'Status: {response.status_code}, Message: {response.json()}')
        response.raise_for_status()

    return response.json()


if __name__ == '__main__':
    # Get all projects from SonarQube
    logging.info('Getting all projects')
    projects = request_sonar_qube(projects_endpoint, params={"organization": SONAR_ORGANIZATION_KEY})['components']
    webhook_url = get_or_create_webhook_url()

    # Iterate over projects and add webhook if it doesn't exist
    webhooks_to_create = []
    for project in projects:
        project_key = project["key"]
        logger.info(f'Fetching existing webhooks in the project: {project_key}')
        webhooks = request_sonar_qube(f'{webhooks_endpoint}/list', params={
            "project": project_key,
            "organization": SONAR_ORGANIZATION_KEY
        })['webhooks']

        if [webhook for webhook in webhooks if webhook['url'] == webhook_url]:
            logger.info(f"Webhook already exists in project: {project_key}")
            continue

        webhooks_to_create.append({
            "name": f"Port {PORT_WEBHOOK_IDENTIFIER}",
            "project": project_key,
            "organization": SONAR_ORGANIZATION_KEY
        })

    # Add the webhook to each project
    for webhook in webhooks_to_create:
        request_sonar_qube(f'{webhooks_endpoint}/create', method='POST', params={
            **webhook,
            "url": webhook_url
        })
        logger.info(f"Webhook added to project: {webhook['project']}")
