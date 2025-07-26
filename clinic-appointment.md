# Clinic Appointment System API Documentation

## Overview

The Clinic Appointment System provides comprehensive APIs for managing clinic-based appointments in the RUSH healthcare platform. This system enables doctors to manage their clinics and patients to book in-person consultations.

## Table of Contents

- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Doctor Clinic Management](#doctor-clinic-management)
- [Appointment Management](#appointment-management)
- [Visit Validation](#visit-validation)
- [Data Models](#data-models)
- [Integration Guide](#integration-guide)
- [Testing](#testing)

---

## Authentication

### Overview
All protected endpoints require JWT authentication. Include the token in the Authorization header.

```http
Authorization: Bearer <your_jwt_token>
```

### Required Roles
- **Doctor Role**: Required for clinic management and doctor-specific operations
- **Patient Role**: Required for booking appointments and patient-specific operations

---

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Optional: validation errors
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Doctor Clinic Management

### 1. Add Clinic

**Endpoint:** `POST /doctor/clinic`  
**Authentication:** Required (Doctor role)

Allows doctors to add a new clinic to their profile.

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer <doctor_jwt_token>
```

#### Request Body
```json
{
  "clinicName": "City Medical Center",
  "address": {
    "line1": "123 Main Street",
    "line2": "Suite 101",
    "landmark": "Near City Hospital",
    "locality": "Downtown",
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

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Clinic added successfully",
  "data": {
    "clinic": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "clinicName": "City Medical Center",
      "address": {
        "line1": "123 Main Street",
        "line2": "Suite 101",
        "landmark": "Near City Hospital",
        "locality": "Downtown",
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
      "isActive": true,
      "createdAt": "2025-07-22T10:30:00.000Z",
      "updatedAt": "2025-07-22T10:30:00.000Z"
    }
  }
}
```

#### Validation Rules
- `clinicName`: Required, 1-100 characters
- `address.line1`: Required, max 200 characters
- `address.locality`: Required, max 100 characters
- `address.city`: Required, max 50 characters
- `address.pincode`: Required, 6-10 characters
- `consultationFee`: Required, 0-10,000
- `operationalDays`: Required, 1-7 days from enum
- `timeSlots`: Required, at least one slot
- `timeSlots.duration`: Must be 15, 30, 45, or 60 minutes
- `timeSlots.startTime/endTime`: Must be in HH:MM format

### 2. Get Doctor Clinics

**Endpoint:** `GET /doctor/clinic`  
**Authentication:** Required (Doctor role)

Retrieves all clinics associated with the authenticated doctor.

#### Request Headers
```http
Authorization: Bearer <doctor_jwt_token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Clinics retrieved successfully",
  "data": {
    "clinics": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "clinicName": "City Medical Center",
        "address": {
          "line1": "123 Main Street",
          "line2": "Suite 101",
          "landmark": "Near City Hospital",
          "locality": "Downtown",
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
        "isActive": true,
        "createdAt": "2025-07-22T10:30:00.000Z",
        "updatedAt": "2025-07-22T10:30:00.000Z"
      }
    ],
    "isActive": true
  }
}
```

### 3. Update Clinic

**Endpoint:** `PUT /doctor/clinic/:clinicId`  
**Authentication:** Required (Doctor role)

Updates an existing clinic's details.

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer <doctor_jwt_token>
```

#### URL Parameters
- `clinicId`: The unique identifier of the clinic to update

#### Request Body (Partial Update)
```json
{
  "clinicName": "Updated Medical Center",
  "consultationFee": 600,
  "operationalDays": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Clinic updated successfully",
  "data": {
    "clinic": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "clinicName": "Updated Medical Center",
      "consultationFee": 600,
      "operationalDays": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      "updatedAt": "2025-07-22T11:00:00.000Z"
    }
  }
}
```

### 4. Delete Clinic

**Endpoint:** `DELETE /doctor/clinic/:clinicId`  
**Authentication:** Required (Doctor role)

Removes a clinic from the doctor's profile.

#### Request Headers
```http
Authorization: Bearer <doctor_jwt_token>
```

#### URL Parameters
- `clinicId`: The unique identifier of the clinic to delete

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Clinic deleted successfully"
}
```

#### Notes
- If this is the doctor's last clinic, the `clinicVisit.isActive` flag will be set to `false`
- All future appointments for this clinic will be affected

---

## Appointment Management

### 1. Get Doctor Clinic Availability

**Endpoint:** `GET /appointment/clinic/doctor/:doctorId`  
**Authentication:** Not required (Public endpoint)

Retrieves a doctor's clinic availability for patients to view before booking.

#### URL Parameters
- `doctorId`: The unique identifier of the doctor

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Doctor clinic availability retrieved successfully",
  "data": {
    "doctor": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b1",
      "user": {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b0",
        "firstName": "Dr. John",
        "lastName": "Smith",
        "profilePic": "https://example.com/profile.jpg"
      },
      "specialization": ["Cardiology", "Internal Medicine"]
    },
    "clinics": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "clinicName": "City Medical Center",
        "address": {
          "line1": "123 Main Street",
          "locality": "Downtown",
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
    ]
  }
}
```

#### Error Cases
- `400`: Invalid doctor ID format
- `404`: Doctor not found or clinic visits not active

### 2. Book Clinic Appointment

**Endpoint:** `POST /appointment/clinic/book`  
**Authentication:** Required (Patient role)

Books a clinic appointment for the authenticated patient.

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer <patient_jwt_token>
```

#### Request Body
```json
{
  "doctorId": "60f7b3b3b3b3b3b3b3b3b3b1",
  "clinicId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "slot": {
    "day": "2025-07-25",
    "duration": 30,
    "time": {
      "start": "2025-07-25T10:00:00.000Z",
      "end": "2025-07-25T10:30:00.000Z"
    }
  },
  "history": {
    "title": "Regular checkup for chest pain"
  }
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Clinic appointment booked successfully",
  "data": {
    "appointment": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b4",
      "doctorId": "60f7b3b3b3b3b3b3b3b3b3b1",
      "patientId": "60f7b3b3b3b3b3b3b3b3b3b2",
      "clinicId": "60f7b3b3b3b3b3b3b3b3b3b3",
      "clinicDetails": {
        "clinicName": "City Medical Center",
        "address": {
          "line1": "123 Main Street",
          "locality": "Downtown",
          "city": "Mumbai",
          "pincode": "400001",
          "country": "India"
        },
        "consultationFee": 500
      },
      "slot": {
        "day": "2025-07-25T00:00:00.000Z",
        "duration": 30,
        "time": {
          "start": "2025-07-25T10:00:00.000Z",
          "end": "2025-07-25T10:30:00.000Z"
        }
      },
      "history": {
        "title": "Regular checkup for chest pain"
      },
      "status": "pending",
      "paymentDetails": {
        "amount": 500,
        "walletDeducted": 500,
        "paymentStatus": "completed"
      },
      "createdAt": "2025-07-22T10:30:00.000Z",
      "updatedAt": "2025-07-22T10:30:00.000Z"
    }
  }
}
```

#### Validation Rules
- `doctorId`: Required, valid MongoDB ObjectId
- `clinicId`: Required, valid clinic ID belonging to the doctor
- `slot.day`: Required, future date
- `slot.duration`: Required, must match clinic's available durations
- `slot.time`: Required, must be within clinic's operational hours
- Patient must have sufficient wallet balance

#### Error Cases
- `400`: Validation errors, insufficient funds, time slot conflicts
- `404`: Doctor or clinic not found
- `409`: Time slot already booked

### 3. Get Patient Clinic Appointments

**Endpoint:** `GET /appointment/clinic/patient`  
**Authentication:** Required (Patient role)

Retrieves all clinic appointments for the authenticated patient.

#### Request Headers
```http
Authorization: Bearer <patient_jwt_token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Patient clinic appointments retrieved successfully",
  "data": {
    "appointments": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b4",
        "doctorId": {
          "_id": "60f7b3b3b3b3b3b3b3b3b3b1",
          "userId": {
            "firstName": "Dr. John",
            "lastName": "Smith",
            "profilePic": "https://example.com/profile.jpg"
          },
          "specialization": ["Cardiology"]
        },
        "clinicDetails": {
          "clinicName": "City Medical Center",
          "address": {
            "line1": "123 Main Street",
            "locality": "Downtown",
            "city": "Mumbai"
          },
          "consultationFee": 500
        },
        "slot": {
          "day": "2025-07-25T00:00:00.000Z",
          "duration": 30,
          "time": {
            "start": "2025-07-25T10:00:00.000Z",
            "end": "2025-07-25T10:30:00.000Z"
          }
        },
        "status": "pending",
        "createdAt": "2025-07-22T10:30:00.000Z"
      }
    ]
  }
}
```

### 4. Get Doctor Clinic Appointments

**Endpoint:** `GET /appointment/clinic/doctor`  
**Authentication:** Required (Doctor role)

Retrieves all clinic appointments for the authenticated doctor.

#### Request Headers
```http
Authorization: Bearer <doctor_jwt_token>
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Doctor clinic appointments retrieved successfully",
  "data": {
    "appointments": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b4",
        "patientId": {
          "_id": "60f7b3b3b3b3b3b3b3b3b3b2",
          "firstName": "Jane",
          "lastName": "Doe",
          "profilePic": "https://example.com/patient.jpg"
        },
        "clinicDetails": {
          "clinicName": "City Medical Center",
          "address": {
            "line1": "123 Main Street",
            "locality": "Downtown",
            "city": "Mumbai"
          }
        },
        "slot": {
          "day": "2025-07-25T00:00:00.000Z",
          "duration": 30,
          "time": {
            "start": "2025-07-25T10:00:00.000Z",
            "end": "2025-07-25T10:30:00.000Z"
          }
        },
        "history": {
          "title": "Regular checkup for chest pain"
        },
        "status": "pending",
        "createdAt": "2025-07-22T10:30:00.000Z"
      }
    ]
  }
}
```

---

## Visit Validation

### 1. Generate OTP

**Endpoint:** `GET /appointment/clinic/:appointmentId/otp`  
**Authentication:** Required (Patient role)

Generates a 6-character alphanumeric OTP for appointment verification. OTP can only be generated on the appointment day.

#### Request Headers
```http
Authorization: Bearer <patient_jwt_token>
```

#### URL Parameters
- `appointmentId`: The unique identifier of the appointment

#### Response (200 OK)
```json
{
  "success": true,
  "message": "OTP generated successfully",
  "data": {
    "otp": "ABC123",
    "expiresAt": "2025-07-22T14:30:00.000Z",
    "remainingAttempts": 3
  }
}
```

#### Error Cases
- `400`: OTP can only be generated on appointment day
- `404`: Appointment not found or doesn't belong to patient
- `409`: Appointment status doesn't allow OTP generation

#### OTP Rules
- 6-character alphanumeric code (uppercase letters and numbers)
- Valid for 24 hours from generation
- Maximum 3 validation attempts
- Can be regenerated if expired

### 2. Validate Visit OTP

**Endpoint:** `POST /appointment/clinic/validate-visit`  
**Authentication:** Required (Doctor role)

Validates the OTP provided by the patient to confirm their visit to the clinic.

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer <doctor_jwt_token>
```

#### Request Body
```json
{
  "appointmentId": "60f7b3b3b3b3b3b3b3b3b3b4",
  "otp": "ABC123"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Visit validated successfully. Appointment completed.",
  "data": {
    "appointment": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b4",
      "status": "completed",
      "completedAt": "2025-07-22T11:00:00.000Z"
    }
  }
}
```

#### Error Cases
- `400`: Invalid OTP, expired OTP, or maximum attempts exceeded
- `404`: Appointment not found
- `403`: Doctor not authorized for this appointment

#### Validation Rules
- OTP must be exactly 6 characters
- OTP must contain only uppercase letters and numbers
- Maximum 3 validation attempts per OTP
- OTP must not be expired

---

## Data Models

### Clinic Schema
```typescript
{
  clinicName: string,           // 1-100 characters
  address: {
    line1: string,              // Required, max 200 characters
    line2?: string,             // Optional, max 200 characters
    landmark?: string,          // Optional, max 100 characters
    locality: string,           // Required, max 100 characters
    city: string,               // Required, max 50 characters
    pincode: string,            // Required, 6-10 characters
    country: string             // Required, max 50 characters, default: "India"
  },
  consultationFee: number,      // 0-10,000
  operationalDays: string[],    // 1-7 days from enum
  timeSlots: [{
    duration: number,           // 15, 30, 45, or 60 minutes
    startTime: string,          // HH:MM format
    endTime: string             // HH:MM format
  }],
  isActive: boolean,            // Default: true
  createdAt: Date,
  updatedAt: Date
}
```

### Appointment Schema
```typescript
{
  doctorId: ObjectId,           // Reference to Doctor
  patientId: ObjectId,          // Reference to User (patient)
  clinicId: string,             // Clinic identifier
  clinicDetails: {
    clinicName: string,
    address: object,
    consultationFee: number
  },
  slot: {
    day: Date,                  // Appointment date
    duration: number,           // 15, 30, 45, or 60 minutes
    time: {
      start: Date,              // Start time
      end: Date                 // End time
    }
  },
  history?: {
    title?: string              // Optional appointment description
  },
  status: string,               // "pending" | "confirmed" | "completed" | "cancelled" | "expired"
  otp?: {
    code: string,               // 6-character alphanumeric
    generatedAt: Date,
    expiresAt: Date,
    attempts: number,           // Default: 0, max: 3
    maxAttempts: number,        // Default: 3
    isUsed: boolean             // Default: false
  },
  paymentDetails: {
    amount: number,             // Total amount
    walletDeducted: number,     // Amount deducted from wallet
    paymentStatus: string       // "pending" | "completed" | "failed"
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

## Integration Guide

### 1. Authentication Flow

```javascript
// 1. Register/Login to get JWT token
const authResponse = await fetch('/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'doctor@example.com',
    phone: '+919876543210',
    otp: '123456',
    role: 'doctor'
  })
});
const { token } = await authResponse.json();

// 2. Use token for authenticated requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};
```

### 2. Doctor Clinic Setup Flow

```javascript
// 1. Add clinic
const clinicData = {
  clinicName: "My Medical Center",
  address: {
    line1: "123 Main St",
    locality: "Downtown",
    city: "Mumbai",
    pincode: "400001",
    country: "India"
  },
  consultationFee: 500,
  operationalDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  timeSlots: [{ duration: 30, startTime: "09:00", endTime: "17:00" }]
};

const response = await fetch('/doctor/clinic', {
  method: 'POST',
  headers,
  body: JSON.stringify(clinicData)
});
```

### 3. Patient Booking Flow

```javascript
// 1. Get doctor availability
const availabilityResponse = await fetch(`/appointment/clinic/doctor/${doctorId}`);
const availability = await availabilityResponse.json();

// 2. Book appointment
const bookingData = {
  doctorId: "60f7b3b3b3b3b3b3b3b3b3b1",
  clinicId: "60f7b3b3b3b3b3b3b3b3b3b3",
  slot: {
    day: "2025-07-25",
    duration: 30,
    time: {
      start: "2025-07-25T10:00:00.000Z",
      end: "2025-07-25T10:30:00.000Z"
    }
  },
  history: { title: "Regular checkup" }
};

const bookingResponse = await fetch('/appointment/clinic/book', {
  method: 'POST',
  headers,
  body: JSON.stringify(bookingData)
});
```

### 4. Visit Validation Flow

```javascript
// Patient generates OTP (on appointment day)
const otpResponse = await fetch(`/appointment/clinic/${appointmentId}/otp`, {
  headers: { 'Authorization': `Bearer ${patientToken}` }
});
const { otp } = await otpResponse.json();

// Doctor validates OTP
const validationResponse = await fetch('/appointment/clinic/validate-visit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${doctorToken}`
  },
  body: JSON.stringify({
    appointmentId,
    otp
  })
});
```

### 5. Error Handling Best Practices

```javascript
async function handleApiCall(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      // Handle specific error cases
      switch (response.status) {
        case 400:
          console.error('Validation error:', data.message);
          break;
        case 401:
          console.error('Authentication required');
          // Redirect to login
          break;
        case 403:
          console.error('Insufficient permissions');
          break;
        case 404:
          console.error('Resource not found');
          break;
        case 409:
          console.error('Conflict:', data.message);
          break;
        default:
          console.error('Unexpected error:', data.message);
      }
      throw new Error(data.message);
    }
    
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```

---

## Testing

### Test Data Examples

```javascript
// Doctor test data
const doctorAuth = {
  email: "test.doctor@rushdr.com",
  password: "testpass123",
  phone: "+919876543210",
  firstName: "Test",
  lastName: "Doctor",
  role: "doctor"
};

// Patient test data
const patientAuth = {
  email: "test.patient@rushdr.com",
  password: "testpass123",
  phone: "+919876543211",
  firstName: "Test",
  lastName: "Patient",
  role: "patient"
};

// Clinic test data
const clinicData = {
  clinicName: "Test Medical Center",
  address: {
    line1: "123 Test Street",
    line2: "Suite 101",
    landmark: "Near Test Hospital",
    locality: "Test Area",
    city: "Mumbai",
    pincode: "400001",
    country: "India"
  },
  consultationFee: 500,
  operationalDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  timeSlots: [
    {
      duration: 30,
      startTime: "09:00",
      endTime: "17:00"
    }
  ],
  isActive: true
};
```

### Postman Collection Setup

1. **Environment Variables**
   ```json
   {
     "baseUrl": "http://localhost:5000",
     "doctorToken": "{{doctor_jwt_token}}",
     "patientToken": "{{patient_jwt_token}}",
     "doctorId": "{{doctor_id}}",
     "clinicId": "{{clinic_id}}",
     "appointmentId": "{{appointment_id}}"
   }
   ```

2. **Test Scripts**
   ```javascript
   // Save response data to environment variables
   if (pm.response.code === 201) {
     const responseJson = pm.response.json();
     if (responseJson.data.clinic) {
       pm.environment.set("clinicId", responseJson.data.clinic._id);
     }
     if (responseJson.data.appointment) {
       pm.environment.set("appointmentId", responseJson.data.appointment._id);
     }
   }
   ```

### cURL Examples

```bash
# Add clinic
curl -X POST http://localhost:5000/doctor/clinic \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DOCTOR_TOKEN" \
  -d '{
    "clinicName": "Test Medical Center",
    "address": {
      "line1": "123 Test Street",
      "locality": "Test Area",
      "city": "Mumbai",
      "pincode": "400001",
      "country": "India"
    },
    "consultationFee": 500,
    "operationalDays": ["monday", "tuesday", "wednesday"],
    "timeSlots": [{"duration": 30, "startTime": "09:00", "endTime": "17:00"}]
  }'

# Book appointment
curl -X POST http://localhost:5000/appointment/clinic/book \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PATIENT_TOKEN" \
  -d '{
    "doctorId": "DOCTOR_ID",
    "clinicId": "CLINIC_ID",
    "slot": {
      "day": "2025-07-25",
      "duration": 30,
      "time": {
        "start": "2025-07-25T10:00:00.000Z",
        "end": "2025-07-25T10:30:00.000Z"
      }
    }
  }'
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Global Rate Limit**: 200 requests per 15 minutes per IP
- **Authentication Endpoints**: Additional rate limiting may apply
- **OTP Generation**: Limited to prevent spam

---

## Security Considerations

1. **Authentication**: All sensitive operations require valid JWT tokens
2. **Authorization**: Role-based access control (doctor vs patient)
3. **Data Validation**: Comprehensive input validation and sanitization
4. **OTP Security**: 
   - Limited attempts (3 max)
   - Time-based expiration (24 hours)
   - Alphanumeric complexity
5. **Wallet Security**: Payment verification before appointment confirmation

---

## Support and Troubleshooting

### Common Issues

1. **Authentication Errors (401)**
   - Verify JWT token is valid and not expired
   - Ensure proper role (doctor/patient) for the endpoint

2. **Validation Errors (400)**
   - Check all required fields are provided
   - Verify data formats match the schema requirements

3. **Booking Conflicts (409)**
   - Check for overlapping time slots
   - Verify clinic availability for the selected time

4. **OTP Issues**
   - OTP can only be generated on the appointment day
   - Maximum 3 validation attempts per OTP
   - OTP expires after 24 hours

### Contact Information

For technical support or integration assistance:
- **API Documentation**: [API Docs URL]
- **Support Email**: support@rushdr.com
- **Developer Portal**: [Developer Portal URL]

---

## Changelog

### Version 1.0.0 (Current)
- Initial release of Clinic Appointment System APIs
- Doctor clinic management functionality
- Patient appointment booking system
- OTP-based visit validation
- Comprehensive error handling and validation

### Upcoming Features
- Appointment rescheduling
- Bulk appointment management
- SMS notifications for OTP
- Advanced clinic analytics
- Multi-clinic appointment coordination

---

*This documentation is maintained by the RUSH Development Team. Last updated: July 22, 2025*
