# MaintainIQ API Documentation

This document outlines the REST API endpoints available on the MaintainIQ platform server.

*   **Base URL**: `http://localhost:5000/api` (or your deployed server URI)
*   **Response Format**: All API responses return standard JSON format matching:
    ```json
    {
      "success": true,
      "message": "Response message",
      "data": { ... }
    }
    ```

---

## 1. Authentication Endpoints

### Register User
Create a new user. Only an Admin user can register new technician accounts.
*   **Route**: `POST /auth/register`
*   **Access**: Public / Admin (restricted logic depending on target role)
*   **Request Body**:
    ```json
    {
      "name": "Rob Tech",
      "email": "robtech@example.com",
      "password": "Password123!",
      "role": "technician",
      "phone": "555-0199"
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "message": "User registered successfully",
      "data": {
        "user": {
          "id": "603f9e8b2f9f123abc456789",
          "name": "Rob Tech",
          "email": "robtech@example.com",
          "role": "technician"
        }
      }
    }
    ```

### Login User
Authenticate credentials to receive a JWT Token.
*   **Route**: `POST /auth/login`
*   **Access**: Public (Subject to Rate Limiting: 5 requests / min)
*   **Request Body**:
    ```json
    {
      "email": "admin@maintainiq.com",
      "password": "AdminPassword123!"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Login successful",
      "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "user": {
          "id": "603f9e8b2f9f987def123456",
          "name": "Default Admin",
          "email": "admin@maintainiq.com",
          "role": "admin"
        }
      }
    }
    ```

### Get Current User Profile
Retrieves active session details.
*   **Route**: `GET /auth/me`
*   **Access**: Private (Requires token)
*   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "user": {
          "id": "603f9e8b2f9f987def123456",
          "name": "Default Admin",
          "email": "admin@maintainiq.com",
          "role": "admin"
        }
      }
    }
    ```

---

## 2. Asset Management Endpoints

### List Assets
Get a filtered list of all assets with search queries.
*   **Route**: `GET /assets`
*   **Access**: Private (Requires Admin / Tech token)
*   **Query Parameters**:
    *   `search` (string) - Matches name, location, category, or code
    *   `status` (string) - Filters by asset status
    *   `page` (number) - Defaults to 1
    *   `limit` (number) - Defaults to 10
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": [
        {
          "_id": "603f9e8b2f9f111aaa111111",
          "assetCode": "ASSET-GEN-001",
          "name": "Generator B",
          "category": "Electrical",
          "location": "Basement",
          "condition": "Fair",
          "status": "Operational",
          "publicSlug": "generator-b-78a2f",
          "qrCodeUrl": "https://res.cloudinary.com/..."
        }
      ],
      "pagination": {
        "total": 1,
        "page": 1,
        "pages": 1
      }
    }
    ```

### Create Asset
Register a new asset. Generates `assetCode`, `publicSlug`, and `qrCodeUrl` automatically.
*   **Route**: `POST /assets`
*   **Access**: Private (Admin Only)
*   **Request Body**:
    ```json
    {
      "name": "HVAC Unit 3",
      "category": "Mechanical",
      "location": "Roof West",
      "condition": "Good"
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "message": "Asset created successfully",
      "data": {
        "_id": "603f9e8b2f9f222bbb222222",
        "assetCode": "ASSET-MEC-002",
        "name": "HVAC Unit 3",
        "category": "Mechanical",
        "location": "Roof West",
        "condition": "Good",
        "status": "Operational",
        "publicSlug": "hvac-unit-3-eec31",
        "qrCodeUrl": "https://api.qrserver.com/..."
      }
    }
    ```

### Get Single Asset
View full details of an asset.
*   **Route**: `GET /assets/:id`
*   **Access**: Public (Resolves by either Mongo ID or public slug)
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "_id": "603f9e8b2f9f123abc456789",
        "assetCode": "ASSET-GEN-001",
        "name": "Generator 2",
        "condition": "Good",
        "status": "Operational",
        "publicSlug": "generator-2-f8c2b"
      }
    }
    ```

---

## 3. Incident reporting & Triage Endpoints

### Submit Public Report
Guests scan the QR code and submit reports to this endpoint.
*   **Route**: `POST /public/assets/:slug/issues`
*   **Access**: Public (Subject to Rate Limiting: 10 requests / min)
*   **Request Body**:
    ```json
    {
      "title": "Unusual clicking noise coming from engine block",
      "description": "The generator starts clicking every 10 seconds. Oil pressure levels appear steady.",
      "category": "Electrical",
      "priority": "Medium",
      "reporterName": "John Safety Officer",
      "reporterContact": "john.safety@example.com",
      "evidenceUrls": ["https://res.cloudinary.com/..."]
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "message": "Issue reported successfully. Emails dispatched.",
      "data": {
        "_id": "603f9e8b2f9f333ccc333333",
        "issueNumber": "INC-00004",
        "status": "Reported",
        "priority": "Medium",
        "reporterName": "John Safety Officer"
      }
    }
    ```

### AI Incident Triage
Uses Gemini AI to parse issue description text and return structural recommendations.
*   **Route**: `POST /issues/triage`
*   **Access**: Public (Subject to Rate Limiting: 5 requests / min)
*   **Request Body**:
    ```json
    {
      "description": "Elevator door is jammed on floor 3. People are in the hall.",
      "assetId": "603f9e8b2f9f123abc456789"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "title": "Elevator Door Jammed on Floor 3",
        "category": "Mechanical",
        "priority": "High",
        "possibleCauses": [
          "Obstruction in track guidance run",
          "Interlock safety switch alignment error"
        ],
        "initialChecks": [
          "Check track for loose debris",
          "Inspect interlock switch indicators"
        ],
        "recurringWarning": "Note: 2 issues have been posted against this Mechanical asset recently. Run structural compliance audit."
      }
    }
    ```

---

## 4. Maintenance Workflows

### Assign Technician
*   **Route**: `PUT /issues/:id/assign`
*   **Access**: Private (Admin Only)
*   **Request Body**:
    ```json
    {
      "technicianId": "603f9e8b2f9f123abc456789"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Issue assigned successfully. Notification email queued.",
      "data": {
        "_id": "603f9e8b2f9f333ccc333333",
        "status": "Assigned",
        "assignedTechnician": "603f9e8b2f9f123abc456789"
      }
    }
    ```

### Log Maintenance Notes
Log work performed. Mandatory step to move issues from 'Under Maintenance' to 'Resolved'.
*   **Route**: `POST /issues/:id/logs`
*   **Access**: Private (Technician Only)
*   **Request Body**:
    ```json
    {
      "inspectionNotes": "Cleaned track and aligned interlock indicators on third floor panel.",
      "workPerformed": "Refitted control track alignment blocks and lubricated hinges.",
      "partsUsed": ["Block guide model A", "Standard Lubricant 10W"],
      "cost": 120.00,
      "finalCondition": "Good",
      "startedAt": "2026-07-12T01:00:00Z",
      "completedAt": "2026-07-12T02:00:00Z"
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "message": "Maintenance work logged successfully",
      "data": {
        "_id": "603f9e8b2f9f555eee555555"
      }
    }
    ```

### Transition Issue Status (State Machine)
*   **Route**: `PUT /issues/:id/status`
*   **Access**: Private (Admin / Assigned Technician)
*   **Request Body**:
    ```json
    {
      "status": "Inspection Started"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Status updated successfully",
      "data": {
        "status": "Inspection Started"
      }
    }
    ```

---

## 5. Dashboard KPIs Endpoints

### Get KPI Metrics
*   **Route**: `GET /dashboard/stats`
*   **Access**: Private (Admin Only)
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "stats": {
          "totalAssets": 12,
          "activeIssues": 5,
          "resolvedIssues": 18
        },
        "conditionDistribution": {
          "Good": 6,
          "Fair": 4,
          "Poor": 2
        },
        "totalMaintenanceCost": 2840.50
      }
    }
    ```
