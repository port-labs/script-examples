import requests

# Configuration
CLIENT_ID = ""
CLIENT_SECRET = ""
API_URL = "https://api.getport.io/v1"


def get_access_token(client_id, client_secret):
    """
    Obtain an access token using the provided client credentials.
    """
    credentials = {"clientId": client_id, "clientSecret": client_secret}
    response = requests.post(f"{API_URL}/auth/access_token", json=credentials)
    response.raise_for_status()
    return response.json().get("accessToken")


def get_all_users(access_token):
    """
    Fetch all users using the provided access token.
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
    }
    response = requests.get(f"{API_URL}/users", headers=headers)
    response.raise_for_status()
    return response.json()


def find_invited_users(users):
    """
    Find users with 'INVITED' status from the user list.
    """
    return [user for user in users if user.get("status") == "INVITED"]


def delete_user(access_token, user_id):
    """
    Delete a user by their ID using the provided access token.
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
    }

    # Send the DELETE request without a Content-Type header or with an empty JSON body
    response = requests.delete(f"{API_URL}/users/{user_id}", headers=headers)
    response.raise_for_status()
    return response.json()


def main():
    try:
        # Obtain an access token
        access_token = get_access_token(CLIENT_ID, CLIENT_SECRET)

        # Fetch all users
        users = get_all_users(access_token)
        print("All Users:", users)

        # Find and delete invited users
        invited_users = find_invited_users(users.get("users", []))
        for user in invited_users:
            print(f"Deleting invited user: {user['email']}")
            delete_response = delete_user(access_token, user['id'])
            print(f"Deleted User Response: {delete_response}")

    except requests.HTTPError as e:
        print(f"HTTP Error: {e.response.status_code} - {e.response.text}")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
