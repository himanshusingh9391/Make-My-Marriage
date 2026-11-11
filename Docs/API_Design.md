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

| Method | Use |
|---|---|
| GET | Retrieve resources |
| POST | Create resources or trigger actions |
| PUT | Replace or upsert a resource where documented |
| PATCH | Partially update a resource |
| DELETE | Delete or initiate controlled deletion |

### 2.4 Authentication

Owner APIs use secure cookie-based sessions.

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

1. Validate the owner session.
2. Obtain the authenticated user ID from the session.
3. Verify wedding ownership.
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

| Status | Meaning |
|---|---|
| 200 | Successful request |
| 201 | Resource created |
| 202 | Accepted for asynchronous processing |
| 204 | Successful request with no response body |
| 400 | Invalid request |
| 401 | Unauthenticated |
| 403 | Authenticated but not permitted |
| 404 | Resource not found |
| 409 | Conflict or duplicate |
| 413 | Payload too large |
| 415 | Unsupported media type |
| 422 | Business rule validation failure |
| 429 | Rate limit exceeded |
| 503 | A required service is unavailable |
| 500 | Internal server error |
| 502 | External provider failure |

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

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Register user |
| POST | `/auth/login` | Public | Authenticate |
| POST | `/auth/logout` | Owner session | End current session |
| GET | `/auth/me` | Owner session | Current user |
| POST | `/auth/verify-email` | Verification token | Verify email |
| POST | `/auth/resend-verification` | Public/session | Resend verification |
| POST | `/auth/forgot-password` | Public | Request password reset |
| POST | `/auth/reset-password` | Reset token | Set new password |

### 5.1 Register

```http
POST /api/v1/auth/register
```

Request:

```json
{
  "partnerOneName": "Ananya Sen",
  "partnerTwoName": "Vikram Rao",
  "email": "ananya@example.com",
  "weddingDate": "2027-02-14",
  "city": "Udaipur",
  "password": "StrongPassword123!",
  "privacyAcknowledged": true
}
```

Response:

```json
{
  "success": true,
  "data": {
    "message": "Your wedding suite is ready. Verify your email to sign in.",
    "emailVerificationRequired": true
  }
}
```

Rules:

- Create the owner account and one initial `DRAFT` wedding workspace from the supplied couple names, optional date, and city.
- The first partner name is the account's display name; the second partner name is stored on the wedding workspace.
- Set the initial wedding timezone to `Asia/Kolkata`.
- Require `privacyAcknowledged` to be `true` before storing the supplied personal and wedding details.
- Normalize email.
- Enforce unique normalized email.
- Require at least 12 characters, with lowercase, uppercase, numeric, and symbol characters; maximum 128 characters.
- Hash password using Argon2id.
- Create verification token and store only its hash.
- Return `emailVerificationRequired` so the client can route to the correct sign-in guidance.
- Never return password hashes or raw verification tokens in the API response.
- If verification email delivery is unavailable, keep the account pending and allow the owner to request another link.
- In local development only, if Resend credentials are absent, activate the account immediately and return `emailVerificationRequired: false`. Email verification remains required in production.
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

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/weddings` | Create wedding |
| GET | `/weddings` | List owned weddings |
| GET | `/weddings/{weddingId}` | Get wedding |
| PATCH | `/weddings/{weddingId}` | Update wedding |
| POST | `/weddings/{weddingId}/archive` | Archive wedding |
| POST | `/weddings/{weddingId}/restore` | Restore if permitted |
| DELETE | `/weddings/{weddingId}` | Start controlled deletion |

### 6.1 Create Wedding

```http
POST /api/v1/weddings
```

Request:

```json
{
  "weddingName": "Rahul and Priya Wedding",
  "couple": {
    "partnerOneName": "Rahul",
    "partnerTwoName": "Priya"
  },
  "weddingDate": "2027-02-14T00:00:00+05:30",
  "timezone": "Asia/Kolkata"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "weddingId": "WEDDING_OBJECT_ID",
    "weddingName": "Rahul and Priya Wedding",
    "status": "DRAFT"
  }
}
```

The server derives `ownerUserId` from the authenticated session. It must not accept an owner ID from the client.

### 6.2 List Weddings

```http
GET /api/v1/weddings
```

Returns only weddings owned by the authenticated user.

### 6.3 Update Wedding

```http
PATCH /api/v1/weddings/{weddingId}
```

Only permitted wedding fields may be modified. Ownership must be verified first.

## 7. Wedding Settings APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/weddings/{weddingId}/settings` | Retrieve settings |
| PATCH | `/weddings/{weddingId}/settings` | Update settings |

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

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/weddings/{weddingId}/events` | Create event |
| GET | `/weddings/{weddingId}/events` | List events |
| GET | `/weddings/{weddingId}/events/{eventId}` | Retrieve event |
| PATCH | `/weddings/{weddingId}/events/{eventId}` | Update event |
| DELETE | `/weddings/{weddingId}/events/{eventId}` | Delete event |

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

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/weddings/{weddingId}/guests` | Add guest |
| GET | `/weddings/{weddingId}/guests` | List guests |
| GET | `/weddings/{weddingId}/guests/{guestId}` | Retrieve guest |
| PATCH | `/weddings/{weddingId}/guests/{guestId}` | Update guest |
| DELETE | `/weddings/{weddingId}/guests/{guestId}` | Delete guest |
| POST | `/weddings/{weddingId}/guests/{guestId}/invite` | Send invitation |
| POST | `/weddings/{weddingId}/guests/{guestId}/revoke-invitation` | Revoke link |
| POST | `/weddings/{weddingId}/guests/{guestId}/regenerate-invitation` | Regenerate link |

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

| Method | Endpoint | Purpose |
|---|---|---|
| PUT | `/weddings/{weddingId}/guests/{guestId}/events/{eventId}` | Create or update assignment |
| GET | `/weddings/{weddingId}/guests/{guestId}/events` | List guest assignments |
| DELETE | `/weddings/{weddingId}/guests/{guestId}/events/{eventId}` | Remove assignment |

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

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/guest/invitations/{token}` | Get own invitation and assigned events |
| PUT | `/guest/invitations/{token}/events/{eventId}/rsvp` | Create or update RSVP |

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

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/weddings/{weddingId}/rsvps` | List owner-visible RSVPs |
| GET | `/weddings/{weddingId}/rsvps/stats` | Get RSVP summary |
| GET | `/weddings/{weddingId}/events/{eventId}/rsvps` | Event-specific RSVP list |

Dashboard statistics should include:

- Yes response count.
- No response count.
- Pending response count.
- Expected attendee headcount.
- RSVP response rate.

Expected headcount sums attendee count for `YES` only.

## 12. Check-In APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/weddings/{weddingId}/events/{eventId}/check-ins` | List event check-in records |
| PATCH | `/weddings/{weddingId}/guest-events/{assignmentId}/check-in` | Update check-in |

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

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/weddings/{weddingId}/tasks` | Create task |
| GET | `/weddings/{weddingId}/tasks` | List tasks |
| GET | `/weddings/{weddingId}/tasks/{taskId}` | Get task |
| PATCH | `/weddings/{weddingId}/tasks/{taskId}` | Update task |
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

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/weddings/{weddingId}/expenses` | Create expense |
| GET | `/weddings/{weddingId}/expenses` | List expenses |
| GET | `/weddings/{weddingId}/expenses/{expenseId}` | Get expense |
| PATCH | `/weddings/{weddingId}/expenses/{expenseId}` | Update expense |
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

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/weddings/{weddingId}/vendors/search` | Search Google Places |
| POST | `/weddings/{weddingId}/vendors` | Save selected vendor |
| GET | `/weddings/{weddingId}/vendors` | List saved vendors |
| GET | `/weddings/{weddingId}/vendors/{vendorId}` | Get vendor |
| PATCH | `/weddings/{weddingId}/vendors/{vendorId}` | Update vendor |
| DELETE | `/weddings/{weddingId}/vendors/{vendorId}` | Delete vendor |

Vendor discovery is server-mediated. The application persists selected vendor records only. This is a directory feature, not a vendor marketplace.

## 16. Public Wedding Website APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/public/weddings/{slug}` | Get published wedding website |
| GET | `/public/weddings/{slug}/events` | Get published events |
| GET | `/public/weddings/{slug}/albums` | Get publicly authorized albums |

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

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/weddings/{weddingId}/albums` | Create album |
| GET | `/weddings/{weddingId}/albums` | List albums |
| GET | `/weddings/{weddingId}/albums/{albumId}` | Get album |
| PATCH | `/weddings/{weddingId}/albums/{albumId}` | Update album |
| DELETE | `/weddings/{weddingId}/albums/{albumId}` | Delete album |
| POST | `/weddings/{weddingId}/photos/upload-url` | Request upload authorization |
| POST | `/weddings/{weddingId}/photos` | Confirm/save photo metadata |
| GET | `/weddings/{weddingId}/photos` | List photos |
| GET | `/weddings/{weddingId}/photos/{photoId}/download-url` | Get authorized download URL |
| DELETE | `/weddings/{weddingId}/photos/{photoId}` | Delete photo |

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

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/weddings/{weddingId}/dashboard` | Get wedding dashboard summary |

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

export const createEventSchema = z.object({
  name: z.string().trim().min(1).max(150),

  type: z.enum([
    "HALDI",
    "MEHENDI",
    "SANGEET",
    "WEDDING",
    "RECEPTION",
    "CUSTOM"
  ]),

  startDate: z.string().datetime(),
  endDate: z.string().datetime(),

  timezone: z.string().min(1),

  maxAttendees: z
    .number()
    .int()
    .positive()
    .optional()
}).refine(
  data => new Date(data.startDate) < new Date(data.endDate),
  {
    message: "Event start must precede event end",
    path: ["endDate"]
  }
);
```

### RSVP

```typescript
export const rsvpSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("YES"),
    attendeeCount: z.number().int().min(1),
    guestMessage: z.string().max(1000).optional()
  }),

  z.object({
    status: z.literal("NO"),
    attendeeCount: z.literal(0),
    guestMessage: z.string().max(1000).optional()
  })
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
