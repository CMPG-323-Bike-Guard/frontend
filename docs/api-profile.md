# Profile and Photo API Contract

All paths are relative to `/api/v1`. Requests and responses use JSON. The API identifies the caller from the authenticated session; callers do not supply a target user ID for profile operations. Error responses use `{ "code": string, "message": string, "field"?: string }`.

## Photo shape

Both `User.photo` and `Bike.photo` use this object:

```ts
{
  live: string | null;
  pending: string | null;
  status: 'none' | 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  submittedAt: string | null;
}
```

`live` is the image currently shown to other users. `pending` is the submitted data URL. A submission does not change `live`. Approval copies `pending` to `live` and clears `pending`. Rejection leaves `live` unchanged and retains the rejected image in `pending`, with `status: 'rejected'` and a non-empty `rejectionReason`. A new submission replaces the prior pending/rejected image and resets review metadata. `photoPath` remains in user and bike responses as a compatibility projection of `photo.live`.

The allowed status values mean:

- `none`: no live or submitted image.
- `pending`: an image is awaiting admin review; the existing live image remains visible.
- `approved`: the latest submitted image is live; `pending` is `null`.
- `rejected`: the rejected image and reason are retained; the previous live image remains visible.

Photo requests carry a base64 data URL. The decoded file must be JPEG, PNG, or WebP and no larger than 5 MiB. The server must validate both the declared media type and decoded content.

## Endpoints

### Update own details

`PATCH /users/me`

Request:

```json
{ "name": "Updated Name", "email": "updated@example.edu", "phone": "+1 555 0100" }
```

Response: the updated `User` object, including `userId`, `studentStaffNumber`, `name`, `role`, `email`, `phone`, `photo`, `photoPath`, and `accountStatus`. Phone may be an empty string in the request, which the mock normalizes to `null`.

Errors: `400 invalid_name` for a name outside 2-80 characters; `400 invalid_email` for an invalid email; `400 invalid_phone` for an invalid phone value; `409 conflict` if the email is already used; `401 unauthenticated`; `403 forbidden` if the session cannot update its own profile.

### Change own password

`POST /users/me/password`

Request:

```json
{ "currentPassword": "current secret", "newPassword": "new secret" }
```

Response: `{ "success": true }`.

Errors: `400 current_password_required` if the current password is missing; `400 invalid_current_password` if it is wrong, using the documented `{ "code": string, "message": string, "field"?: string }` error shape; `400 invalid_password` if the new password is shorter than 8 characters; `401 unauthenticated`; `403 forbidden` if the caller is not updating their own account. The backend must verify the current password and store only a secure password hash. The mock requires a non-empty current password and validates the new password length, but deliberately does not store, compare, or log either value.

### Submit own profile picture

`POST /users/me/photo`

Request:

```json
{ "photoDataUrl": "data:image/jpeg;base64,..." }
```

Response: the updated `User` object. The new picture is in `photo.pending`; `photo.live` and `photoPath` remain unchanged until approval.

Errors: `400 invalid_file_type` for anything other than JPG, PNG, or WebP; `400 file_too_large` above 5 MiB; `400 invalid_photo` for malformed/empty data; `401 unauthenticated`; `403 forbidden` if the caller is not updating their own account.

### Submit a bike photo

`POST /bikes/{bikeId}/photo`

Request:

```json
{ "photoDataUrl": "data:image/webp;base64,..." }
```

Response: the updated `BikeView` (`bike`, `tag`, `owner`, and `permissions`). The submitted image is in `bike.photo.pending`; `bike.photo.live` and `bike.photoPath` remain unchanged until approval.

Errors: `400 invalid_file_type`, `400 file_too_large`, or `400 invalid_photo` for invalid uploads; `401 unauthenticated`; `403 forbidden` if the caller does not own the bike; `404 not_found` if the bike does not exist.

### List pending photos (admin)

`GET /photos/pending`

Response: an array of `PendingPhoto` objects:

```ts
{
  targetType: 'user' | 'bike';
  entityId: string;
  ownerUserId: string;
  ownerName: string;
  photo: Photo;
}[]
```

Only records with `photo.status === 'pending'` are returned, newest first. Errors: `401 unauthenticated`; `403 forbidden` unless the caller is an admin.

### Approve a photo (admin)

`POST /photos/{targetType}/{entityId}/approve`, where `targetType` is `user` or `bike`.

Request: no body.

Response:

```ts
{ "targetType": "user", "entityId": "u-102", "photo": { "...": "Photo fields" } }
```

Approval moves `photo.pending` to `photo.live`, clears `pending` and `rejectionReason`, sets `status` to `approved`, and records `reviewedBy` and `reviewedAt`. Errors: `401 unauthenticated`; `403 forbidden` unless the caller is an admin; `404 not_found` if the target does not exist; `409 not_pending` if there is no pending photo.

### Reject a photo (admin)

`POST /photos/{targetType}/{entityId}/reject`, where `targetType` is `user` or `bike`.

Request:

```json
{ "reason": "Please upload a clearer image." }
```

Response: the same `PhotoReviewResult` shape as approval. Rejection keeps `photo.live` unchanged, retains the submitted image in `photo.pending`, sets `status` to `rejected`, stores the reason, and records `reviewedBy` and `reviewedAt`.

Errors: `400 reason_required` for a missing/blank reason; `401 unauthenticated`; `403 forbidden` unless the caller is an admin; `404 not_found` if the target does not exist; `409 not_pending` if there is no pending photo.