# Photo & GPS Upload App

A simple web application to capture photos with GPS coordinates and upload them to AWS S3 and Google Sheets.

## Prerequisites

1.  **Node.js**: Ensure Node.js is installed.
2.  **AWS S3 Bucket**:
    *   Create an S3 bucket.
    *   (Optional) Configure CORS on the bucket if you plan to access it directly from the browser (though this app proxies through the backend).
    *   Create an IAM user with `AmazonS3FullAccess` (or a more restrictive policy allowing `PutObject`).
    *   Get the `Access Key ID` and `Secret Access Key`.
3.  **Google Sheets API**:
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   Create a new project.
    *   Enable the **Google Sheets API**.
    *   Create a **Service Account**.
    *   Download the JSON key file for the service account.
    *   **Share your Google Sheet** with the service account email address (found in the JSON file) giving it "Editor" access.

## Setup

1.  **Clone/Download** the project.
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Configure Environment**:
    *   Copy `.env.example` to `.env`.
    *   Fill in your AWS and Google credentials.
    *   Place your Google Service Account JSON file in the project root (or update the path in `.env`).

    ```ini
    # .env
    AWS_ACCESS_KEY_ID=Attributes...
    AWS_SECRET_ACCESS_KEY=...
    AWS_REGION=us-east-1
    S3_BUCKET_NAME=my-field-photos
    S3_FOLDER=field-photos

    GOOGLE_SHEET_ID=your_sheet_id_from_url
    GOOGLE_SERVICE_ACCOUNT_JSON=./service-account.json
    ```

## Running the App

1.  Start the server:
    ```bash
    npm start
    ```
    Or for development with auto-reload:
    ```bash
    npm run dev
    ```

2.  Open your browser and navigate to:
    `http://localhost:4050`

    *Note: Geolocation requires a secure context (HTTPS) or `localhost`. If accessing from another device on the network, you'll need to set up HTTPS or port forwarding.*

## Usage

1.  The app will ask for **Camera** and **Location** permissions. Allow them.
2.  Point the camera and click **Capture Photo**.
3.  Review the photo. The app will fetch your GPS coordinates.
4.  Once coordinates are found, click **Upload**.
5.  If successful, the photo is saved to S3, and a new row is added to your Google Sheet.
