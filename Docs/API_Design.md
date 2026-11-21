# Make My Marriage

## API Design Document

**Version:** 2.0  
**Status:** Draft for Review  
**API Style:** REST JSON  
**Base Path:** `/api/v1`  
**Backend:** Next.js Route Handlers  
**Language:** TypeScript  
**Validation:** Zod  
**Authentication:** Secure Cookie-Based Sessions

---

## 1. Purpose

This document defines the REST API contract for Make My Marriage, including endpoint conventions, authentication, authorization, request validation, response formats, error handling, endpoint catalog, and key business rules.

The API is designed for a multi-user, multi-wedding application. Every private wedding API must enforce ownership and wedding-level data isolation.

## 2. API Conventions

### 2.1 Base URL

```text
https://<application-domain>/api/v1
```

### 2.2 Data Format

- Request format: JSON, except supported file uploads.
- Response format: JSON.
- Character encoding: UTF-8.
- Dates: ISO 8601.
- Stored timestamps: UTC.
- Display timezone: wedding's configured IANA timezone.

### 2.3 HTTP Methods

| Method | Use                                           |
| ------ | --------------------------------------------- |
| GET    | Retrieve resources                            |
| POST   | Create resources or trigger actions           |
| PUT    | Replace or upsert a resource where documented |
| PATCH  | Partially update a resource                   |
| DELETE | Delete or initiate controlled deletion        |

### 2.4 Authentication

Private APIs use secure cookie-based sessions. The owner retains full wedding ownership. Membership-enabled endpoints may authorize an invited Admin or Manager against the exact wedding.

The session cookie must be configured with:

- `HttpOnly`
- `Secure` in production
- Appropriate `SameSite`
- Restricted path
- Appropriate expiry

State-changing cookie-authenticated requests must have CSRF protection.

Guests use secure invitation tokens. Guest endpoints must expose only the guest's assigned events, own RSVP records, and explicitly authorized gallery content.

### 2.5 Authorization Rules

For all private wedding APIs:

1. Validate the authenticated session.
2. Obtain the authenticated user ID from the session.
3. Verify wedding ownership or membership, according to the endpoint's role requirements.
4. Use the verified wedding ID for all subsequent queries.
5. Verify every referenced resource belongs to that wedding.

A client-provided `weddingId`, `guestId`, `eventId`, or other identifier is not authorization proof.

## 3. Standard Response Formats

### 3.1 Success

```json
{
  "success": true,
  "data": {
    "id": "RESOURCE_OBJECT_ID"
  }
}
```

### 3.2 List Response

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

### 3.3 Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": []
  }
}
```

### 3.4 Common HTTP Status Codes

| Status | Meaning                                  |
| ------ | ---------------------------------------- |
| 200    | Successful request                       |
| 201    | Resource created                         |
| 202    | Accepted for asynchronous processing     |
| 204    | Successful request with no response body |
| 400    | Invalid request                          |
| 401    | Unauthenticated                          |
| 403    | Authenticated but not permitted          |
| 404    | Resource not found                       |
| 409    | Conflict or duplicate                    |
| 413    | Payload too large                        |
| 415    | Unsupported media type                   |
| 422    | Business rule validation failure         |
| 429    | Rate limit exceeded                      |
| 503    | A required service is unavailable        |
| 500    | Internal server error                    |
| 502    | External provider failure                |

The implementation may return 404 for inaccessible tenant resources to avoid disclosing their existence.

## 4. Pagination, Filtering, and Sorting

List endpoints should support consistent pagination where applicable.

Example:

```text
GET /api/v1/weddings/{weddingId}/guests?page=1&limit=20
```

Recommended query parameters:

- `page`
- `limit`
- `sort`
- `order`
- Resource-specific filters.

Rules:

- Apply a sensible default page size.
- Enforce a maximum page size.
- Reject invalid pagination values.
- Never return unbounded guest or photo lists.
- Apply wedding scope before filtering or aggregation.

## 5. Authentication APIs

All paths below are relative to `/api/v1`.

| Method | Endpoint                    | Authentication     | Purpose                |
| ------ | --------------------------- | ------------------ | ---------------------- |
| POST   | `/auth/register`            | Public             | Register user          |
| POST   | `/auth/login`               | Public             | Authenticate           |
| POST   | `/auth/logout`              | Owner session      | End current session    |
| GET    | `/auth/me`                  | Owner session      | Current user           |
| POST   | `/auth/verify-email`        | Verification token | Verify email           |
| POST   | `/auth/resend-verification` | Public/session     | Resend verification    |
| POST   | `/auth/forgot-password`     | Public             | Request password reset |
| POST   | `/auth/reset-password`      | Reset token        | Set new password       |

### 5.1 Register

```http
POST /api/v1/auth/register
```

Request:

```json
{
  "fullName": "Ananya Sen",
  "email": "ananya@example.com",
  "password": "StrongPassword123!"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "message": "Your account is ready. Verify your email, then sign in to set up your wedding.",
    "emailVerificationRequired": true
  }
}
```

Rules:

- Create only the owner account. Wedding details are collected after the owner signs in.
- Normalize email.
- Enforce unique normalized email.
- Require at least 12 characters, with lowercase, uppercase, numeric, and symbol characters; maximum 128 characters.
- Hash password using Argon2id.
- Create an ACTIVE account without sending a verification email; leave emailVerifiedAt null unless email ownership is separately confirmed.
- Return `emailVerificationRequired` so the client can route to the correct sign-in guidance.
- Never return password hashes or raw verification tokens in the API response.
- Signup and login do not depend on Resend availability.
- Return `emailVerificationRequired: false` in every environment. Correct-password login activates legacy PENDING_VERIFICATION accounts; suspended accounts remain blocked.
- If MongoDB cannot be reached, return a structured `503 DATABASE_UNAVAILABLE` response; do not attempt to create the account or wedding without persistence.

### 5.2 Login

```http
POST /api/v1/auth/login
```

Request:

```json
{
  "email": "rahul@example.com",
  "password": "StrongPassword123!",
  "rememberMe": false
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "USER_OBJECT_ID",
      "fullName": "Rahul Sharma",
      "email": "rahul@example.com"
    }
  }
}
```

The server sets the session cookie. Do not return the raw session token in JSON. A standard session lasts one day; opting in to “remember me” extends it to 30 days.

### 5.3 Logout

```http
POST /api/v1/auth/logout
```

The server revokes the current session and clears the cookie.

### 5.4 Current User

```http
GET /api/v1/auth/me
```

Returns the authenticated user's safe profile fields and verification status.

### 5.5 Forgot and Reset Password

```http
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

Reset request example:

```json
{
  "email": "rahul@example.com"
}
```

Reset submission:

```json
{
  "token": "RAW_RESET_TOKEN",
  "newPassword": "NewStrongPassword123!"
}
```

Rules:

- Use generic responses to prevent email enumeration.
- Token must be single-use and unexpired.
- Store only token hash.
- Revoke active sessions after successful reset.

## 6. Wedding APIs

| Method | Endpoint                        | Purpose                                    |
| ------ | ------------------------------- | ------------------------------------------ |
| POST   | `/weddings`                     | Create the owner's first wedding workspace |
| GET    | `/weddings`                     | List owned weddings                        |
| GET    | `/weddings/{weddingId}`         | Get wedding                                |
| PATCH  | `/weddings/{weddingId}`         | Update wedding                             |
| POST   | `/weddings/{weddingId}/archive` | Archive wedding                            |
| POST   | `/weddings/{weddingId}/restore` | Restore if permitted                       |
| DELETE | `/weddings/{weddingId}`         | Start controlled deletion                  |

### 6.1 Create Wedding

```http
POST /api/v1/weddings
```

Request:

```json
{
  "title": "Rahul and Priya’s Wedding",
  "description": "A joyful celebration with family and friends.",
  "partnerOneName": "Rahul",
  "partnerTwoName": "Priya",
  "city": "Jaipur",
  "weddingDate": "2027-02-14",
  "weddingDateIsTentative": true
}
```

Response:

```json
{
  "success": true,
  "data": {
    "weddingId": "WEDDING_OBJECT_ID",
    "weddingName": "Rahul and Priya’s Wedding",
    "status": "ACTIVE"
  }
}
```

The server derives `ownerUserId` from the authenticated session. It must not accept an owner ID from the client. This first-workspace setup returns `409 WEDDING_ALREADY_EXISTS` if the owner already has a workspace. The server uses `title` as the wedding name, derives a unique slug, and sets the timezone to `Asia/Kolkata`. `description` is stored in the wedding's settings document. The endpoint rejects cross-site fetches and mismatched `Origin` headers.

### 6.2 List Weddings

```http
GET /api/v1/weddings
```

Returns only weddings owned by the authenticated user.

### 6.3 Update Wedding

```http
PATCH /api/v1/weddings/{weddingId}
```

The owner may retrieve and update only their own wedding. `GET` returns the wedding title, description, partner names, city, date, tentative-date flag, timezone, and status. `PATCH` accepts any non-empty subset of `title`, `description`, `partnerOneName`, `partnerTwoName`, `city`, `weddingDate`, and `weddingDateIsTentative`. Send `weddingDate: null` to clear the date. Ownership is verified before reading or writing; cross-site and mismatched-origin updates are rejected.

### 6.4 Wedding Members and Invitations

| Method | Endpoint                                           | Authentication                           | Purpose                                    |
| ------ | -------------------------------------------------- | ---------------------------------------- | ------------------------------------------ |
| GET    | `/weddings/{weddingId}/members`                    | Owner or member session                  | List active members and invitation history |
| POST   | `/weddings/{weddingId}/members`                    | Owner or Admin session                   | Create and email an invitation             |
| DELETE | `/weddings/{weddingId}/invitations/{invitationId}` | Owner or Admin session                   | Revoke a pending invitation                |
| POST   | `/invitations/preview`                             | Public invitation token in JSON body     | Show a safe invitation preview             |
| POST   | `/invitations/accept`                              | Verified user session + invitation token | Join the wedding workspace                 |

Create request:

```json
{ "email": "planner@example.com", "role": "MANAGER" }
```

`role` is `ADMIN` or `MANAGER`. Owner, Admin, and Manager can invite and revoke member and guest invitations. Role changes are deferred; removal follows the restrictions below.

The server normalizes email, rejects an existing member or active duplicate invitation, creates a random single-use token, stores only its HMAC hash, and sends a seven-day acceptance link through Resend. `RESEND_FROM_EMAIL` supports `onboarding@resend.dev` for testing to the Resend account email. Other recipients require a verified domain. Invalid server email configuration returns `503 SERVER_CONFIGURATION_ERROR`. A provider test-recipient restriction returns `503 RESEND_TEST_SENDER_RESTRICTED` and revokes the failed invitation for retry. Invitation records retain `deliveryStatus` (`PENDING`, `SENT`, `FAILED`) and history. If Resend rejects delivery, the failed link is revoked, its record remains in history, and the API returns `502 INVITATION_DELIVERY_FAILED` with the safe provider error code so the Admin can diagnose it and create a replacement.

Acceptance requires an active, email-verified account whose normalized email matches the invite. Wrong-email accounts receive `403 INVITATION_EMAIL_MISMATCH`; expired or revoked links are rejected; an existing membership returns `409 ALREADY_A_MEMBER`. A successful acceptance creates one unique `(weddingId,userId)` membership and redirects into that selected wedding workspace. Raw invitation tokens must not appear in logs or API list responses.

## 7. Wedding Settings APIs

| Method | Endpoint                         | Purpose           |
| ------ | -------------------------------- | ----------------- |
| GET    | `/weddings/{weddingId}/settings` | Retrieve settings |
| PATCH  | `/weddings/{weddingId}/settings` | Update settings   |

Supported settings include:

- Website theme.
- Website description.
- Countdown.
- Livestream URL.
- RSVP defaults.
- RSVP update preference.
- Gallery enabled/visibility.
- Invitation email preference.
- Reminder email preference.

Allowed themes:

- `ELEGANT_ROYAL`
- `MINIMAL_MODERN`
- `TRADITIONAL_INDIAN`

## 8. Event APIs

### Implemented contract - 2026-11-18

This increment implements all five routes below for Owners, Admins, and Managers, with session authentication, Zod validation, wedding-scoped queries, and same-origin mutations. Archived weddings reject writes with 409. The broader example below describes future venue enrichment; the current strict request contract is:

```json
{
  "name": "Engagement Ceremony",
  "type": "CUSTOM",
  "description": "An evening together",
  "startDate": "2026-12-25T10:00:00+05:30",
  "endDate": null,
  "venue": { "name": "Grand Ballroom", "address": "Jaipur" },
  "dressCode": "Traditional pastels",
  "notes": "Private planning notes",
  "rsvpDeadline": null,
  "maxAttendees": null,
  "status": "DRAFT"
}
```

- Required: name (1–150 characters), type, startDate (ISO timestamp with offset), and venue object (empty name/address permitted). Optional strings default empty; endDate/deadline/capacity default null; status defaults DRAFT. Description/notes limit 2,000, venue name 150, address 500, dress code 200. Capacity, if supplied, is a positive integer up to 1,000,000.
- Type: HALDI/MEHENDI/SANGEET/WEDDING/RECEPTION/CUSTOM. Status: DRAFT/PUBLISHED/CANCELLED. End must follow start if supplied; RSVP deadline cannot follow start. The server derives timezone from the wedding; clients cannot override it.
- POST returns 201 `{ success: true, data: Event }`. Event includes normalized fields above plus `id`, `timezone`, and ISO `updatedAt`; no wedding ownership or session fields are returned.
- GET list accepts `page` (1-based), returns `{ events, timezone, pagination: { page, total, hasMore } }` in the data envelope. Page size is 20; chronological order is stable by startDate then ID. Total includes cancelled events but excludes deleted events.
- GET single returns Event. PATCH submits the complete editable fields plus `expectedUpdatedAt` from the last read. The server replaces editable fields, rejects missing version with 400 EVENT_VERSION_REQUIRED and stale version with 409 EVENT_CHANGED. Cancellation uses the same endpoint with status CANCELLED.
- DELETE returns `{ eventId, removed: true }` and soft-deletes the event. It no longer appears in private reads/lists or dashboard counts; records/references remain for history.
- Missing/inaccessible weddings and cross-wedding/missing events return 404. Invalid input returns the standard 400 VALIDATION_ERROR envelope. No live emails, guest assignments, RSVP collection, Places lookup, or public website publication occur through these endpoints.
- Machine-readable contract: `openapi/events.yaml` (Events module).

| Method | Endpoint                                 | Purpose        |
| ------ | ---------------------------------------- | -------------- |
| POST   | `/weddings/{weddingId}/events`           | Create event   |
| GET    | `/weddings/{weddingId}/events`           | List events    |
| GET    | `/weddings/{weddingId}/events/{eventId}` | Retrieve event |
| PATCH  | `/weddings/{weddingId}/events/{eventId}` | Update event   |
| DELETE | `/weddings/{weddingId}/events/{eventId}` | Delete event   |

### Create Event

```http
POST /api/v1/weddings/{weddingId}/events
```

Request:

```json
{
  "name": "Wedding Reception",
  "type": "RECEPTION",
  "description": "Reception celebration",
  "startDate": "2027-02-14T19:00:00+05:30",
  "endDate": "2027-02-14T23:00:00+05:30",
  "timezone": "Asia/Kolkata",
  "rsvpDeadline": "2027-02-01T23:59:00+05:30",
  "maxAttendees": 500,
  "venue": {
    "name": "Grand Convention Hall",
    "formattedAddress": "Hyderabad, Telangana, India",
    "city": "Hyderabad",
    "state": "Telangana",
    "country": "India",
    "googlePlaceId": "PLACE_ID",
    "directionsUrl": "https://maps.google.com/?q=..."
  }
}
```

Validation:

- Event type must be supported.
- Start must precede end.
- Timezone must be valid.
- Event capacity, if supplied, must be positive.
- Event must belong to the authorized wedding.

## 9. Guest APIs

| Method | Endpoint                                                       | Purpose         |
| ------ | -------------------------------------------------------------- | --------------- |
| POST   | `/weddings/{weddingId}/guests`                                 | Add guest       |
| GET    | `/weddings/{weddingId}/guests`                                 | List guests     |
| GET    | `/weddings/{weddingId}/guests/{guestId}`                       | Retrieve guest  |
| PATCH  | `/weddings/{weddingId}/guests/{guestId}`                       | Update guest    |
| DELETE | `/weddings/{weddingId}/guests/{guestId}`                       | Delete guest    |
| POST   | `/weddings/{weddingId}/guests/{guestId}/invite`                | Send invitation |
| POST   | `/weddings/{weddingId}/guests/{guestId}/revoke-invitation`     | Revoke link     |
| POST   | `/weddings/{weddingId}/guests/{guestId}/regenerate-invitation` | Regenerate link |

### Add Guest

```http
POST /api/v1/weddings/{weddingId}/guests
```

Request:

```json
{
  "fullName": "Amit Kumar",
  "email": "amit@example.com",
  "phone": "+919876543210",
  "groupName": "Friends",
  "notes": "College friend"
}
```

Email and phone are optional. Guest name is required.

## 10. Guest-Event Assignment APIs

A guest can be assigned to multiple events. Each assignment carries its own maximum attendee count.

| Method | Endpoint                                                  | Purpose                     |
| ------ | --------------------------------------------------------- | --------------------------- |
| PUT    | `/weddings/{weddingId}/guests/{guestId}/events/{eventId}` | Create or update assignment |
| GET    | `/weddings/{weddingId}/guests/{guestId}/events`           | List guest assignments      |
| DELETE | `/weddings/{weddingId}/guests/{guestId}/events/{eventId}` | Remove assignment           |

### Assign Guest to Event

```http
PUT /api/v1/weddings/{weddingId}/guests/{guestId}/events/{eventId}
```

Request:

```json
{
  "maxAttendees": 4
}
```

Rules:

- Guest and event must belong to the same wedding.
- Maximum attendance must be a positive integer.
- Existing RSVP data must be checked before reducing the maximum.
- Assignment is unique per guest-event.

## 11. Guest Invitation and RSVP APIs

These endpoints use the guest's invitation token rather than an owner session.

| Method | Endpoint                                           | Purpose                                |
| ------ | -------------------------------------------------- | -------------------------------------- |
| GET    | `/guest/invitations/{token}`                       | Get own invitation and assigned events |
| PUT    | `/guest/invitations/{token}/events/{eventId}/rsvp` | Create or update RSVP                  |

### 11.1 Retrieve Invitation

```http
GET /api/v1/guest/invitations/{token}
```

The response contains:

- Wedding public details.
- Guest's own name.
- Assigned events.
- Event details and venue.
- Guest's current RSVP for each assigned event.
- RSVP deadline.
- Maximum attendee count for each assignment.

It must not contain other guests or their responses.

### 11.2 Submit or Update RSVP

```http
PUT /api/v1/guest/invitations/{token}/events/{eventId}/rsvp
```

YES example:

```json
{
  "status": "YES",
  "attendeeCount": 3,
  "guestMessage": "Looking forward to attending!"
}
```

NO example:

```json
{
  "status": "NO",
  "attendeeCount": 0,
  "guestMessage": null
}
```

Validation:

- Token must be valid and active.
- Guest must be assigned to the requested event.
- Event must belong to the invitation's wedding.
- RSVP deadline must not have passed.
- Status must be `YES` or `NO`.
- `YES` requires attendee count at least 1.
- `YES` count must not exceed `guest_events.maxAttendees`.
- `NO` requires attendee count 0.
- The count includes the invited guest.
- Duplicate RSVP records are prevented by the unique guest-event key.
- Updating an existing response is permitted only while the deadline policy allows it.

Pending is the initial state before the guest responds. It is not a guest-submitted selection.

### 11.3 RSVP Dashboard APIs

| Method | Endpoint                                       | Purpose                  |
| ------ | ---------------------------------------------- | ------------------------ |
| GET    | `/weddings/{weddingId}/rsvps`                  | List owner-visible RSVPs |
| GET    | `/weddings/{weddingId}/rsvps/stats`            | Get RSVP summary         |
| GET    | `/weddings/{weddingId}/events/{eventId}/rsvps` | Event-specific RSVP list |

Dashboard statistics should include:

- Yes response count.
- No response count.
- Pending response count.
- Expected attendee headcount.
- RSVP response rate.

Expected headcount sums attendee count for `YES` only.

## 12. Check-In APIs

| Method | Endpoint                                                     | Purpose                     |
| ------ | ------------------------------------------------------------ | --------------------------- |
| GET    | `/weddings/{weddingId}/events/{eventId}/check-ins`           | List event check-in records |
| PATCH  | `/weddings/{weddingId}/guest-events/{assignmentId}/check-in` | Update check-in             |

Request:

```json
{
  "status": "ARRIVED",
  "checkedInAttendeeCount": 3,
  "notes": "Family arrived together"
}
```

The server verifies the assignment belongs to the specified wedding and event. The checked-in count cannot exceed the permitted assignment attendance.

## 13. Task APIs

### Implemented contract - 2026-11-19

All five routes below require a secure session and wedding Owner/Admin/Manager access. Mutations enforce same-origin requests; archived weddings reject writes. POST creates a task with title (1–160 chars), optional description, assignedUserId, eventId, dueDate (`YYYY-MM-DD`), priority, status, category and notes. Description/notes max 2,000; category max 100. Defaults are empty optional text, null optional IDs/date, MEDIUM priority and TODO status. Both relationship IDs must belong to the authorized wedding; assignment cannot target a guest, pending invitation, inactive user, or cancelled/deleted event.

GET list accepts `tab=all|mine|completed`, optional status, priority, eventId (ObjectId or `general`), assignedUserId (ObjectId or `unassigned`), and page (default 1). Filters combine; `mine` always includes the acting-user constraint. It returns data `{ tasks, counts: { all, mine, completed }, pagination: { page, total, hasMore } }`; page size 25, ordered by dueDate then createdAt descending and ID. Counts are wedding-wide tab counts, independent of filters. Removed tasks are excluded. Empty query fields should be omitted.

GET single and POST/PATCH return a Task view containing editable fields plus id, updatedAt, completedAt, derived overdue, memberName and eventName. POST returns 201. PATCH accepts one or more editable fields plus required `expectedUpdatedAt` from the last read, including a status-only update; stale changes return 409 TASK_CHANGED. Completed timestamps are server-managed. DELETE soft-deletes and returns `{ taskId, removed: true }`. Invalid assignee/event returns 400 INVALID_TASK_ASSIGNEE/INVALID_TASK_EVENT; malformed input returns 400 VALIDATION_ERROR; missing/inaccessible resources return 404. No email is sent. Machine-readable route contract: `openapi/tasks.yaml`.

| Method | Endpoint                               | Purpose     |
| ------ | -------------------------------------- | ----------- |
| POST   | `/weddings/{weddingId}/tasks`          | Create task |
| GET    | `/weddings/{weddingId}/tasks`          | List tasks  |
| GET    | `/weddings/{weddingId}/tasks/{taskId}` | Get task    |
| PATCH  | `/weddings/{weddingId}/tasks/{taskId}` | Update task |
| DELETE | `/weddings/{weddingId}/tasks/{taskId}` | Delete task |

Task statuses:

- `TODO`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

Priorities:

- `LOW`
- `MEDIUM`
- `HIGH`
- `URGENT`

## 14. Expense APIs

| Method | Endpoint                                     | Purpose        |
| ------ | -------------------------------------------- | -------------- |
| POST   | `/weddings/{weddingId}/expenses`             | Create expense |
| GET    | `/weddings/{weddingId}/expenses`             | List expenses  |
| GET    | `/weddings/{weddingId}/expenses/{expenseId}` | Get expense    |
| PATCH  | `/weddings/{weddingId}/expenses/{expenseId}` | Update expense |
| DELETE | `/weddings/{weddingId}/expenses/{expenseId}` | Delete expense |

Create request:

```json
{
  "name": "Decoration Advance",
  "category": "DECORATION",
  "amountMinor": 2500000,
  "currency": "INR",
  "expenseDate": "2027-01-10",
  "vendorId": null,
  "paymentStatus": "PARTIALLY_PAID",
  "notes": "Advance payment"
}
```

For INR, `2500000` paise represents ₹25,000.

The API records actual expenses only. It does not provide budget forecasting or remaining-budget fields.

## 15. Vendor APIs

| Method | Endpoint                                   | Purpose              |
| ------ | ------------------------------------------ | -------------------- |
| GET    | `/weddings/{weddingId}/vendors/search`     | Search Google Places |
| POST   | `/weddings/{weddingId}/vendors`            | Save selected vendor |
| GET    | `/weddings/{weddingId}/vendors`            | List saved vendors   |
| GET    | `/weddings/{weddingId}/vendors/{vendorId}` | Get vendor           |
| PATCH  | `/weddings/{weddingId}/vendors/{vendorId}` | Update vendor        |
| DELETE | `/weddings/{weddingId}/vendors/{vendorId}` | Delete vendor        |

Vendor discovery is server-mediated. The application persists selected vendor records only. This is a directory feature, not a vendor marketplace.

## 16. Public Wedding Website APIs

| Method | Endpoint                         | Purpose                        |
| ------ | -------------------------------- | ------------------------------ |
| GET    | `/public/weddings/{slug}`        | Get published wedding website  |
| GET    | `/public/weddings/{slug}/events` | Get published events           |
| GET    | `/public/weddings/{slug}/albums` | Get publicly authorized albums |

Public responses must exclude:

- Guest lists.
- Guest contact details.
- RSVP records.
- Private notes.
- Tasks.
- Expenses.
- Vendor private notes.
- Owner account information.
- Invitation tokens.
- Internal IDs not required by the public UI.

Only published wedding content is returned.

## 17. Album and Gallery APIs

| Method | Endpoint                                              | Purpose                      |
| ------ | ----------------------------------------------------- | ---------------------------- |
| POST   | `/weddings/{weddingId}/albums`                        | Create album                 |
| GET    | `/weddings/{weddingId}/albums`                        | List albums                  |
| GET    | `/weddings/{weddingId}/albums/{albumId}`              | Get album                    |
| PATCH  | `/weddings/{weddingId}/albums/{albumId}`              | Update album                 |
| DELETE | `/weddings/{weddingId}/albums/{albumId}`              | Delete album                 |
| POST   | `/weddings/{weddingId}/photos/upload-url`             | Request upload authorization |
| POST   | `/weddings/{weddingId}/photos`                        | Confirm/save photo metadata  |
| GET    | `/weddings/{weddingId}/photos`                        | List photos                  |
| GET    | `/weddings/{weddingId}/photos/{photoId}/download-url` | Get authorized download URL  |
| DELETE | `/weddings/{weddingId}/photos/{photoId}`              | Delete photo                 |

### Upload Flow

1. Owner requests an upload URL.
2. Server checks wedding ownership and album access.
3. Server validates allowed file size and type.
4. Server generates a unique R2 object key.
5. Server returns a short-lived presigned upload URL.
6. Client uploads directly to R2.
7. Client confirms the upload.
8. Server verifies the object exists and matches expected constraints.
9. Server creates or updates MongoDB photo metadata.

Objects remain private by default. Presigned URLs are short-lived and scoped to the authorized object.

Only the owner can delete photos.

## 18. Dashboard API

| Method | Endpoint                          | Purpose                       |
| ------ | --------------------------------- | ----------------------------- |
| GET    | `/weddings/{weddingId}/dashboard` | Get wedding dashboard summary |

Suggested response:

```json
{
  "success": true,
  "data": {
    "upcomingEvents": 3,
    "totalInvited": 120,
    "yesResponses": 65,
    "noResponses": 20,
    "pendingResponses": 35,
    "expectedHeadcount": 93,
    "pendingTasks": 8,
    "actualExpenseTotalMinor": 25000000
  }
}
```

All values must be scoped to the authorized wedding. The expected headcount must sum only Yes RSVP attendee counts.

## 19. Email and Webhook APIs

### Send Invitation

```http
POST /api/v1/weddings/{weddingId}/guests/{guestId}/invite
```

### Send RSVP Reminder

```http
POST /api/v1/weddings/{weddingId}/guests/{guestId}/events/{eventId}/remind
```

### Resend Webhook

```http
POST /api/v1/webhooks/resend
```

Requirements:

- Verify provider webhook signatures.
- Use idempotency keys or provider event IDs.
- Safely ignore duplicate webhook deliveries.
- Update email-log status.
- Never log raw invitation or password-reset tokens.
- Deduplicate reminders per guest-event and campaign.

The webhook route uses provider signature verification, not ordinary owner-session authentication.

## 20. WhatsApp Sharing

No WhatsApp Business API endpoint is required.

The frontend can:

- Copy the invitation URL.
- Copy a prepared invitation message.
- Open a WhatsApp share URL.

The secure invitation URL must not be exposed in unrelated logs or analytics.

## 21. Zod Validation Examples

### Create Event

```typescript
import { z } from "zod";

export const createEventSchema = z
  .object({
    name: z.string().trim().min(1).max(150),

    type: z.enum([
      "HALDI",
      "MEHENDI",
      "SANGEET",
      "WEDDING",
      "RECEPTION",
      "CUSTOM",
    ]),

    startDate: z.string().datetime(),
    endDate: z.string().datetime(),

    timezone: z.string().min(1),

    maxAttendees: z.number().int().positive().optional(),
  })
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: "Event start must precede event end",
    path: ["endDate"],
  });
```

### RSVP

```typescript
export const rsvpSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("YES"),
    attendeeCount: z.number().int().min(1),
    guestMessage: z.string().max(1000).optional(),
  }),

  z.object({
    status: z.literal("NO"),
    attendeeCount: z.literal(0),
    guestMessage: z.string().max(1000).optional(),
  }),
]);
```

The service layer must additionally verify assignment maximum and deadline. Zod validation alone is not authorization.

## 22. API Security Requirements

- Secure session validation on every owner endpoint.
- CSRF defenses on state-changing cookie-authenticated requests.
- Wedding ownership verification for all private wedding APIs.
- Guest invitation token validation for guest APIs.
- Rate limits for login, registration, password reset, invitations, RSVP, and upload authorization.
- Zod validation for path parameters, query parameters, and bodies.
- Safe response shaping to prevent data leakage.
- Restrict public endpoints to published data.
- Private R2 storage and short-lived signed URLs.
- Resend webhook signature verification.
- No raw tokens or secrets in logs.
- Idempotency for email and webhook operations.

## 23. API Testing Requirements

### Authentication

- Registration success.
- Duplicate email rejection.
- Login and logout.
- Invalid credentials.
- Session expiration and revocation.
- Password-reset token expiry and single use.

### Ownership and Tenant Isolation

- Owner can access their wedding.
- Owner cannot access another user's wedding.
- Cross-wedding event IDs are rejected.
- Cross-wedding guest IDs are rejected.
- Dashboard and aggregates remain wedding-scoped.

### Guest and RSVP

- Invalid invitation token rejected.
- Revoked invitation rejected.
- Guest sees assigned events only.
- Guest cannot see other guest data.
- RSVP Yes requires count at least one.
- RSVP No requires count zero.
- Count exceeding assignment maximum rejected.
- RSVP after deadline rejected.
- RSVP update before deadline succeeds.
- Duplicate RSVP record prevented.

### Gallery

- Unauthorized upload rejected.
- Oversized file rejected.
- Invalid MIME or file signature rejected.
- Cross-wedding album access rejected.
- Unauthorized photo download rejected.
- Guest photo deletion rejected.
- R2 cleanup verified after deletion.

### Integrations

- Resend webhook signature validation.
- Duplicate webhook ignored safely.
- Email idempotency.
- Google Places errors handled safely.
- R2 transient errors handled with bounded retries.

## 24. OpenAPI Documentation

The API should be maintained as an OpenAPI 3.1 specification.

Recommended project location:

```text
openapi/
  openapi.yaml
```

The specification should define:

- Server URLs for local, staging, and production.
- Cookie-based session security scheme.
- Guest invitation token security scheme.
- Request and response schemas.
- Path and query parameters.
- Error response schemas.
- Pagination.
- Webhook signature requirements.
- Endpoint tags for each module.

The OpenAPI contract must be updated whenever an endpoint or response schema changes.

## 25. Final API Design Summary

The API uses REST JSON under `/api/v1`, implemented using Next.js Route Handlers.

Owner endpoints use secure cookie sessions and wedding ownership checks. Guest endpoints use secure invitation tokens and expose only the guest's assigned events and own RSVP information. All wedding-owned data is queried using an authorized `weddingId`.

The API enforces event-specific RSVP rules, assignment maximums, deadlines, check-in constraints, secure gallery access, email idempotency, and provider webhook verification.

No Express backend, vendor marketplace, guest accounts, or WhatsApp Business API is included in the initial release.

### 2026-11-14 authentication and invitation continuation

Signup/login no longer require verification email. Resend sends dashboard member invitations; existing password recovery remains available. Invitation acceptance requires an active authenticated account whose normalized email matches the invitation, plus its valid single-use token. Invitation-aware sign-in accepts the invitation then opens the existing wedding workspace. No new wedding is created for invitees. Optional `nextTo` on registration/resend-verification is restricted to the internal invitation acceptance path; legacy verification links can retain that destination.

### Approved clarification ? 2026-11-14: invited-member verification

This supersedes the earlier same-day blanket removal of signup verification. Ordinary registration still creates an ACTIVE account without email delivery. Registration from a valid invitation includes optional `nextTo` (restricted to `/invitations/accept?token=...`), validates invitation expiry/status/delivery and recipient email, creates a PENDING_VERIFICATION account, and sends a 24-hour hashed verification token. Pending accounts cannot log in before verification. The verification URL and resend flow preserve the invitation destination. After verification, sign-in accepts the invitation and redirects to its existing wedding dashboard; it creates no wedding. Role comes from the stored invitation and the shared sidebar lists owner then members. Existing active accounts can sign in and accept invitations directly. Failed verification delivery keeps the account pending with a resend option; suspended accounts remain blocked. No new collections or raw token storage are introduced.

### 2026-11-16 ? Members and guest invitation APIs

- `GET /weddings/{weddingId}/members?page=1`: authenticated wedding members; adds `counts: { pending, accepted }` across all invitations and `pagination: { page, hasMore }`; invitation history uses 50 rows per page.
- `DELETE /weddings/{weddingId}/members/{memberId}`: owner removes Admin/Manager; Admin or Manager removes another Manager. No self/owner removal. Returns `{ memberId, removed: true }`; removes only this wedding membership. Existing invitation history remains accepted and cannot restore access.
- `GET /weddings/{weddingId}/guest-invitations?page=1`: owner/Admin only; 25 rows per page, full pending/accepted counts, guest name/email/status/sentAt/expiresAt and pagination.
- `POST /weddings/{weddingId}/guest-invitations`: owner/Admin only; strict `{ fullName, email }`, sends a seven-day guest acceptance link. Returns 201 `{ guestId, status: "PENDING" }`. Duplicate pending/accepted invitation returns 409. Failed/revoked/expired invitations may be replaced with a fresh token. Delivery failures return 502 and retain FAILED status.
- `DELETE /weddings/{weddingId}/guest-invitations?guestId=...`: owner/Admin only, revokes a pending invitation.
- `POST /guest-invitations/accept`: public, strict `{ token }`. Atomically accepts a sent, pending, unexpired invitation for an available wedding. Returns only weddingName/status; repeated acceptance is idempotent. No user, session, membership, event assignment, or RSVP is created. Invalid links return 404; expired/revoked/failed links return 410.

All private operations scope by weddingId; mutations check same-origin. Guest email sends are rate limited. Guest and member counts remain separate.

### 2026-11-17 ? Invitation permission and concurrency clarification

Owners, Admins, and Managers can send and revoke member and guest invitations within their wedding. Admins and Managers may remove other Managers; only the owner may remove Admins. Self/owner removal remains forbidden. Concurrent invitation state changes can return `409 INVITATION_CHANGED`; refresh before retrying. Member acceptance requires SENT delivery status and commits membership and acceptance atomically.

## Guest management increment ? 2026-11-19

Implemented owner/Admin/Manager session endpoints under /api/v1:

- GET /weddings/{weddingId}/guests: q (name, family, email, phone substring), eventId, rsvpStatus (PENDING/YES/NO/MIXED), page (25 groups/page). Returns data { guests, total, page, hasMore }.
- POST /weddings/{weddingId}/guests: fullName (required, 1?120), email (optional, valid email or empty), phone (optional, max 30), groupName (optional, max 120), notes (optional, max 2000), maxPartySize (required integer 1?1000), eventIds (optional unique array, up to 100). Returns the saved guest with 201.
- GET /weddings/{weddingId}/guests/{guestId}: guest details and assigned-event RSVP summaries.
- PATCH /weddings/{weddingId}/guests/{guestId}: submits the same complete editable form plus expectedUpdatedAt (ISO timestamp); replaces its selected events atomically. Stale edits return 409 GUEST_CHANGED.
- DELETE /weddings/{weddingId}/guests/{guestId}: soft-removes the guest, revokes their link, and returns {guestId, removed:true}. RSVP/assignment history is retained.

Guest views contain id, fullName, email, phone, groupName, notes, maxPartySize, updatedAt, eventIds, events [{id,name,status,attendeeCount}], and aggregate rsvpStatus. No invitation token is returned. Missing optional text is returned as empty text. An existing email is unique within a wedding (409 GUEST_EMAIL_EXISTS). All private operations enforce wedding isolation; archived weddings are read-only.

Each selected event receives maxAttendees=maxPartySize in guest_events. New assignments must refer to active events in the same wedding; existing unavailable assignments can be retained. A responded assignment cannot be removed (409 GUEST_HAS_RSVP); party size cannot be below a confirmed attendee count (409 PARTY_SIZE_TOO_SMALL). The individual per-event assignment APIs described above remain future work; the current form applies one group limit to all selected events.

RSVP summaries use only responses for assigned events: all YES => YES, all NO => NO, no responses/all pending => PENDING, otherwise MIXED. Attendance is shown per event to avoid counting the same person multiple times. Event filtering selects guest groups assigned to that event; RSVP filtering applies to the group's overall response status. Invitation acceptance is not an RSVP. Public event RSVP submission remains a later increment.

Adding/editing a guest never sends email. Existing Members-page guest-invitations endpoints can invite a saved guest by matching their email. An email change invalidates old invitation tokens and clears delivery/acceptance state. Unsent records are excluded from the invitation roster.

## Personal invitations and live RSVP increment - 2026-11-21

This implements the guest-token RSVP APIs described in section 11. Guest links do not require a user account, cookie, or login. Owners/Admins/Managers manage links through session-authenticated, same-origin routes:

- GET /weddings/{weddingId}/guests/{guestId}/rsvp-link returns {active, expiresAt}; it never returns an existing raw token.
- POST at that route creates/replaces the RSVP link and returns 201 {url, active:true, expiresAt}. Links created here expire after 30 days. Replacing invalidates the previous link without deleting responses.
- DELETE at that route revokes RSVP access and retains responses.
- GET /guest/invitations/{token} returns the guest's personal invitation: guestName, weddingName, partner names, weddingDate, city, timezone, description, expiresAt, and only their active assigned events. Event views contain id, name, description, UTC start/end, venueName/address, dressCode, maxAttendees, deadline, closed, own status/count/message. No guest contact details, private notes, other guests, internal owner data, or dashboard permission is exposed.
- PUT /guest/invitations/{token} accepts {responses:[{eventId,response:{status,attendeeCount,guestMessage?}}]}. 1-100 unique events; all submitted responses commit atomically.
- PUT /guest/invitations/{token}/events/{eventId}/rsvp accepts a single {status,attendeeCount,guestMessage?}. YES requires an integer 1-1000; NO requires zero; message max 1000 characters.

Public response writes validate token expiry/revocation, wedding availability, current guest-event assignment, active event, deadline, guest party/assignment limits, and total event capacity. Errors include 410 INVITATION_UNAVAILABLE, 403 EVENT_NOT_ASSIGNED, 409 RSVP_CLOSED, 400 RSVP_PARTY_LIMIT, and 409 EVENT_CAPACITY_REACHED. Saves return the updated personal invitation in the standard success envelope. Request validation remains Zod; tokens have 256 bits of randomness and only HMAC hashes are stored. Public writes check Origin when supplied, and requests are rate limited with fixed 15-minute key windows (30 writes, 300 API reads, 120 page loads per token/window).

The guest page lives at /invite/{token}, with noindex/no-referrer/no-store handling. The personal token explicitly authorizes its assigned non-cancelled events (including planning drafts); it does not publish the wedding website. Archived/deleted weddings and removed guests are unavailable. Public invitation and API request paths are excluded from development request logging.

New Members-page email invitations include the personal RSVP URL with the existing seven-day expiry and a separate receipt acknowledgement link. Receipt acceptance remains distinct from event attendance. Email failure revokes the newly generated RSVP token; guest email changes clear it; guest deletion revokes it. Existing receipt-only links remain supported. Creating/copying an RSVP link does not send email.

Guest confirmations update immediately from the save response. Dashboard/Guests/Invitations & RSVP screens refresh server data every five seconds while visible and on focus; refresh pauses for active forms or open dialogs. A same-browser BroadcastChannel also requests a refresh after a save. Other open personal invitation pages poll every 15 seconds while not editing. RSVP totals count responses and YES headcounts per active guest-event assignment, not distinct people across the wedding. Guest details show the guest's response messages. Machine-readable contract: openapi/rsvp.json.

Shared invitations (2026-11-21): POST /api/v1/weddings/{weddingId}/shared-invitation with eventIds and maxPartySize issues or replaces a 30-day link. DELETE revokes registration. Public POST /api/v1/guest/invitations/open/{token} accepts name, optional phone, visitorKey, status (YES/NO), and attendeeCount (1–1000 for YES, 0 for NO). It returns 201 `{ path: "/invite/households/{privateToken}" }`.

The shared link remains a reusable starting form for every household. After a successful response the browser clears its temporary visitor key and redirects to the returned private household link. Public GET and PUT `/guest/invitations/households/{privateToken}` read or update only that household's name, optional phone, attendance status, and attendee count. The raw private token is delivered only once in the redirect path; only its hash is stored, it shares the common link expiry, and link revocation invalidates it. Opening the common link later starts a fresh response rather than editing a prior household.
