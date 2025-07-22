# Clinic Visit Appointment System

This document outlines the new clinic visit appointment system that allows doctors to set up multiple clinic locations and patients to book in-person appointments.

## Features

### 1. Doctor Clinic Management
- Doctors can add multiple clinic locations to their profile
- Each clinic has detailed address information, consultation fees, and availability
- Configurable operational days and time slots
- Active/inactive status management for each clinic

### 2. Patient Booking System
- Patients can view doctor's available clinics
- Automatic fee calculation based on selected clinic
- Wallet balance verification before booking
- Real-time slot conflict checking

### 3. Appointment Management
- Integrated with existing appointment system
- Status tracking: pending → confirmed → completed → expired
- Automatic expiry handling via cron jobs

### 4. Visit Validation System
- OTP-based visit validation for appointment completion
- 6-digit alphanumeric OTP with 24-hour validity
- Limited verification attempts (max 3)
- OTP displayed in patient app (no SMS required)

## API Endpoints

### Doctor Clinic Management

#### Add Clinic Location
```
POST /doctor/clinic
Authorization: Bearer token (doctor role required)
```

**Request Body:**
```json
{
  "clinicName": "Dr. Smith Medical Center",
  "address": {
    "line1": "123 Medical Street",
    "line2": "Suite 101",
    "landmark": "Near City Hospital",
    "locality": "Medical District",
    "city": "Mumbai",
    "pincode": "400001",
    "country": "India"
  },
  "consultationFee": 500,
  "operationalDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "timeSlots": [
    {
      "duration": 30,
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ],
  "isActive": true
}
```

#### Get Doctor's Clinics
```
GET /doctor/clinic
Authorization: Bearer token (doctor role required)
```

#### Update Clinic
```
PUT /doctor/clinic/:clinicId
Authorization: Bearer token (doctor role required)
```

#### Delete Clinic
```
DELETE /doctor/clinic/:clinicId
Authorization: Bearer token (doctor role required)
```

### Patient Booking

#### Get Doctor's Clinic Availability
```
GET /appointment/clinic/doctor/:doctorId
```

**Response:**
```json
{
  "success": true,
  "message": "Doctor clinic availability retrieved successfully",
  "data": {
    "doctor": {
      "_id": "doctorId",
      "user": {
        "firstName": "John",
        "lastName": "Smith",
        "profilePic": "profile-url"
      },
      "specialization": ["Cardiology"]
    },
    "clinics": [
      {
        "_id": "clinicId",
        "clinicName": "Dr. Smith Medical Center",
        "address": {...},
        "consultationFee": 500,
        "operationalDays": [...],
        "timeSlots": [...],
        "isActive": true
      }
    ]
  }
}
```

#### Book Clinic Appointment
```
POST /appointment/clinic/book
Authorization: Bearer token (patient role required)
```

**Request Body:**
```json
{
  "doctorId": "doctorObjectId",
  "clinicId": "clinicObjectId",
  "slot": {
    "day": "2025-07-25",
    "duration": 30,
    "time": {
      "start": "2025-07-25T10:00:00.000Z",
      "end": "2025-07-25T10:30:00.000Z"
    }
  },
  "history": {
    "title": "Follow-up consultation"
  }
}
```

### Appointment Management

#### Get Patient's Clinic Appointments
```
GET /appointment/clinic/patient
Authorization: Bearer token (patient role required)
```

#### Get Doctor's Clinic Appointments
```
GET /appointment/clinic/doctor
Authorization: Bearer token (doctor role required)
```

### Visit Validation

#### Generate/Get OTP for Appointment
```
GET /appointment/clinic/:appointmentId/otp
Authorization: Bearer token (patient role required)
```

**Response:**
```json
{
  "success": true,
  "message": "OTP retrieved successfully",
  "data": {
    "otp": "ABC123",
    "expiresAt": "2025-07-26T10:00:00.000Z"
  }
}
```

#### Validate Visit OTP
```
POST /appointment/clinic/validate-visit
Authorization: Bearer token (doctor role required)
```

**Request Body:**
```json
{
  "appointmentId": "appointmentObjectId",
  "otp": "ABC123"
}
```

## Database Schema

### ClinicAppointment Model
```typescript
{
  doctorId: ObjectId (ref: Doctor)
  patientId: ObjectId (ref: User)
  clinicId: String
  clinicDetails: {
    clinicName: String
    address: Object
    consultationFee: Number
  }
  slot: {
    day: Date
    duration: Number (15|30|45|60)
    time: {
      start: Date
      end: Date
    }
  }
  history: {
    title: String
  }
  status: "pending"|"confirmed"|"completed"|"cancelled"|"expired"
  otp: {
    code: String
    generatedAt: Date
    expiresAt: Date
    attempts: Number
    maxAttempts: Number
    isUsed: Boolean
  }
  paymentDetails: {
    amount: Number
    walletDeducted: Number
    paymentStatus: "pending"|"completed"|"failed"
  }
  timestamps: true
}
```

### Doctor Model Extension
The doctor model has been extended with a `clinicVisit` field:
```typescript
clinicVisit: {
  isActive: Boolean
  clinics: [{
    clinicName: String
    address: Object
    consultationFee: Number
    operationalDays: [String]
    timeSlots: [{
      duration: Number
      startTime: String
      endTime: String
    }]
    isActive: Boolean
    createdAt: Date
    updatedAt: Date
  }]
}
```

## Validation Rules

### Clinic Creation/Update
- Clinic name: 1-100 characters
- Address fields: Required (line1, locality, city, pincode, country)
- Consultation fee: Non-negative number, max 10,000
- Operational days: At least 1 day, max 7 days
- Time slots: At least 1 slot, duration must be 15/30/45/60 minutes
- Time format: HH:MM (24-hour format)

### Appointment Booking
- Doctor ID and clinic ID required
- Slot information must be complete
- Duration must match available options
- Patient must have sufficient wallet balance

### OTP Validation
- OTP must be exactly 6 characters
- Only uppercase letters and numbers allowed
- Maximum 3 verification attempts
- 24-hour validity period

## Security Features

- JWT-based authentication for all endpoints
- Role-based access control (doctor/patient specific operations)
- Wallet balance verification before booking
- Time slot conflict prevention
- Rate limiting on sensitive operations
- OTP attempt limitations
- Secure OTP generation using crypto module

## Automation

### Cron Jobs
- Daily midnight execution to update expired appointments
- Automatically sets status to "expired" for past appointments
- Applies to both clinic and online appointments

## Error Handling

All endpoints follow consistent error response format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Validation errors if applicable
}
```

Common HTTP status codes:
- 200: Success
- 201: Created successfully
- 400: Bad request/validation error
- 401: Unauthorized
- 403: Forbidden (insufficient role)
- 404: Resource not found
- 500: Internal server error

## Integration Points

### Wallet System
- Automatic deduction of consultation fee on booking
- Balance verification before appointment confirmation
- Transaction tracking in payment details

### Existing Appointment System
- Shared appointment listing views
- Consistent status management
- Integrated expiry handling

### File Management
- Uses existing AWS S3 integration for any future file uploads
- Follows established signed URL patterns

This clinic visit appointment system provides a comprehensive solution for in-person medical consultations while maintaining consistency with the existing online appointment infrastructure.
