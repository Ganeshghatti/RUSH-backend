# Frontend Integration Guide - Clinic Appointments & Wallet Freezing

## Overview
This guide covers the essential APIs for integrating clinic appointments with the new wallet freezing system. Money is only deducted after appointment completion, not at booking time.

## Base URL
```
https://your-api-domain.com/api
```

## Authentication
All protected endpoints require JWT token:
```javascript
headers: {
  'Authorization': `Bearer ${userToken}`,
  'Content-Type': 'application/json'
}
```

---

## 🏥 Doctor APIs

### 1. Add Clinic
```javascript
POST /doctor/clinic

// Body
{
  "clinicName": "City Medical Center",
  "address": {
    "line1": "123 Main Street",
    "locality": "Downtown", 
    "city": "Mumbai",
    "pincode": "400001",
    "country": "India"
  },
  "consultationFee": 500,
  "frontDeskNumber": "+919876543210",
  "operationalDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "timeSlots": [{
    "duration": 30,
    "startTime": "09:00",
    "endTime": "17:00"
  }]
}

// Response
{
  "success": true,
  "message": "Clinic added successfully",
  "data": { "clinic": {...} }
}
```

### 2. Get Doctor's Clinics
```javascript
GET /doctor/clinic

// Response
{
  "success": true,
  "data": {
    "clinics": [
      {
        "_id": "clinic_id",
        "clinicName": "City Medical Center",
        "consultationFee": 500,
        "frontDeskNumber": "+919876543210",
        // ... other fields
      }
    ]
  }
}
```

### 3. Get Doctor's Appointments
```javascript
GET /appointment/clinic/doctor

// Response
{
  "success": true,
  "data": {
    "appointments": [
      {
        "_id": "appointment_id",
        "patientId": { "firstName": "John", "lastName": "Doe" },
        "status": "pending", // pending, confirmed, completed, cancelled
        "paymentDetails": {
          "paymentStatus": "pending", // pending, frozen, completed
          "amount": 500
        },
        "slot": {
          "day": "2025-07-26T00:00:00.000Z",
          "time": {
            "start": "2025-07-26T10:00:00.000Z",
            "end": "2025-07-26T10:30:00.000Z"
          }
        }
      }
    ]
  }
}
```

### 4. Confirm Appointment (Freezes Patient's Money)
```javascript
POST /appointment/clinic/confirm/:appointmentId

// Response
{
  "success": true,
  "message": "Appointment confirmed successfully. Payment amount has been frozen from patient's wallet.",
  "data": {
    "appointmentId": "...",
    "status": "confirmed",
    "otpGenerated": true,
    "paymentStatus": "frozen",
    "amountFrozen": 500
  }
}
```

### 5. Validate Visit OTP (Completes Payment)
```javascript
POST /appointment/clinic/validate-visit

// Body
{
  "appointmentId": "appointment_id",
  "otp": "ABC123"
}

// Response
{
  "success": true,
  "message": "Visit validated successfully. Appointment completed.",
  "data": {
    "appointment": {
      "status": "completed"
      // Payment is now deducted from patient's wallet
    }
  }
}
```

### 6. Cancel Appointment
```javascript
POST /appointment/clinic/cancel/:appointmentId

// Response
{
  "success": true,
  "message": "Appointment cancelled successfully",
  "data": {
    "refunded": 500,
    "refundType": "unfrozen" // or "refunded"
  }
}
```

---

## 👤 Patient APIs

### 1. Get Doctor Availability
```javascript
GET /appointment/clinic/doctor/:doctorId

// Response
{
  "success": true,
  "data": {
    "doctor": {
      "user": { "firstName": "Dr. John", "lastName": "Smith" },
      "specialization": ["Cardiology"]
    },
    "clinics": [
      {
        "_id": "clinic_id",
        "clinicName": "City Medical Center",
        "address": {...},
        "consultationFee": 500,
        "frontDeskNumber": "+919876543210",
        "operationalDays": ["monday", "tuesday"],
        "timeSlots": [...]
      }
    ]
  }
}
```

### 2. Book Appointment (No Money Deducted Yet!)
```javascript
POST /appointment/clinic/book

// Body
{
  "doctorId": "doctor_id",
  "clinicId": "clinic_id", 
  "slot": {
    "day": "2025-07-26",
    "duration": 30,
    "time": {
      "start": "2025-07-26T10:00:00.000Z",
      "end": "2025-07-26T10:30:00.000Z"
    }
  }
}

// Response
{
  "success": true,
  "message": "Clinic appointment booked successfully. Payment will be processed when doctor confirms the appointment.",
  "data": {
    "appointment": {...},
    "walletBalance": 1000,
    "availableBalance": 1000, // Same as wallet since nothing frozen yet
    "note": "Amount will be deducted from wallet when doctor confirms the appointment"
  }
}
```

### 3. Get Patient's Appointments
```javascript
GET /appointment/clinic/patient

// Response
{
  "success": true,
  "data": {
    "appointments": [
      {
        "_id": "appointment_id",
        "doctorId": {
          "userId": { "firstName": "Dr. John", "lastName": "Smith" },
          "specialization": ["Cardiology"]
        },
        "clinicDetails": {
          "clinicName": "City Medical Center",
          "frontDeskNumber": "+919876543210",
          "consultationFee": 500
        },
        "status": "pending", // pending, confirmed, completed, cancelled
        "paymentDetails": {
          "paymentStatus": "pending", // pending, frozen, completed
          "amount": 500
        },
        "slot": {...}
      }
    ]
  }
}
```

---

## 💰 Wallet Status Understanding

### Payment Flow States:
1. **Booking**: `paymentStatus: "pending"` - No money touched
2. **Doctor Confirms**: `paymentStatus: "frozen"` - Money frozen from wallet
3. **Visit Completed**: `paymentStatus: "completed"` - Money actually deducted
4. **Cancelled**: Money unfrozen or refunded based on current state

### Frontend Implementation Suggestions:

#### 1. Wallet Display Component
```javascript
// Show both total and available balance
const WalletDisplay = ({ walletData }) => {
  return (
    <div className="wallet-info">
      <div>Total Balance: ₹{walletData.wallet}</div>
      <div>Available Balance: ₹{walletData.availableBalance}</div>
      {walletData.frozenAmount > 0 && (
        <div className="frozen-amount">
          Frozen: ₹{walletData.frozenAmount}
        </div>
      )}
    </div>
  );
};
```

#### 2. Appointment Status Badges
```javascript
const getStatusBadge = (appointment) => {
  const { status, paymentDetails } = appointment;
  
  if (status === 'pending') {
    return <Badge color="orange">Awaiting Doctor Confirmation</Badge>;
  }
  if (status === 'confirmed' && paymentDetails.paymentStatus === 'frozen') {
    return <Badge color="blue">Confirmed - Payment Frozen</Badge>;
  }
  if (status === 'completed') {
    return <Badge color="green">Completed - Payment Processed</Badge>;
  }
  if (status === 'cancelled') {
    return <Badge color="red">Cancelled</Badge>;
  }
};
```

#### 3. Booking Flow Implementation
```javascript
const bookAppointment = async (bookingData) => {
  try {
    // 1. Book appointment (no payment yet)
    const response = await fetch('/appointment/clinic/book', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Show success message with payment info
      showNotification({
        type: 'success',
        title: 'Appointment Booked!',
        message: 'Payment will be processed when doctor confirms your appointment.'
      });
      
      // Update wallet display
      updateWalletDisplay(result.data.walletBalance, result.data.availableBalance);
    }
  } catch (error) {
    console.error('Booking failed:', error);
  }
};
```

#### 4. Doctor Confirmation Flow
```javascript
const confirmAppointment = async (appointmentId) => {
  try {
    const response = await fetch(`/appointment/clinic/confirm/${appointmentId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    
    const result = await response.json();
    
    if (result.success) {
      showNotification({
        type: 'success',
        title: 'Appointment Confirmed!',
        message: `₹${result.data.amountFrozen} has been frozen from patient's wallet. OTP generated for visit validation.`
      });
      
      // Refresh appointments list
      fetchAppointments();
    }
  } catch (error) {
    console.error('Confirmation failed:', error);
  }
};
```

#### 5. OTP Validation Component
```javascript
const OTPValidation = ({ appointmentId, onSuccess }) => {
  const [otp, setOtp] = useState('');
  
  const validateOTP = async () => {
    try {
      const response = await fetch('/appointment/clinic/validate-visit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${doctorToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ appointmentId, otp })
      });
      
      const result = await response.json();
      
      if (result.success) {
        showNotification({
          type: 'success',
          title: 'Visit Validated!',
          message: 'Payment has been processed. Appointment completed.'
        });
        onSuccess();
      }
    } catch (error) {
      console.error('OTP validation failed:', error);
    }
  };
  
  return (
    <div className="otp-validation">
      <input 
        value={otp}
        onChange={(e) => setOtp(e.target.value.toUpperCase())}
        placeholder="Enter 6-digit OTP"
        maxLength={6}
      />
      <button onClick={validateOTP}>Validate Visit</button>
    </div>
  );
};
```

---

## 🎨 UI/UX Recommendations

### 1. Patient Booking Flow
- **Step 1**: Show doctor availability with clear pricing
- **Step 2**: Time slot selection with "No payment required now" message
- **Step 3**: Booking confirmation with wallet info and next steps
- **Step 4**: Status tracking with clear payment state indicators

### 2. Wallet Section
- Show total balance prominently
- Display available balance (after frozen amounts)
- List frozen amounts with appointment details
- Clear explanation of wallet freezing system

### 3. Appointment Cards
- Color-coded status badges
- Payment status indicators
- Next action buttons based on current state
- Clear timeline of appointment progress

### 4. Notifications
- Real-time updates when payment status changes
- Clear messaging about wallet freezing/unfreezing
- Confirmation messages for each step

### 5. Error Handling
```javascript
const handleApiError = (error, response) => {
  if (response.status === 400 && response.data?.message?.includes('Insufficient')) {
    showNotification({
      type: 'error',
      title: 'Insufficient Balance',
      message: `You need ₹${response.data.required} but only have ₹${response.data.available} available.`
    });
  }
  // Handle other error cases...
};
```

---

## 🔄 Real-time Updates (Optional)

Consider implementing websockets or polling for:
- Appointment status changes
- Payment status updates  
- Wallet balance changes
- New appointment confirmations

---

## 📱 Mobile Considerations

- Implement proper loading states for API calls
- Show skeleton screens during data fetching
- Handle offline scenarios gracefully
- Optimize for touch interactions on mobile devices

---

This guide provides the essential APIs and implementation patterns needed to integrate the clinic appointment system with wallet freezing functionality. Focus on clear user communication about the payment flow to avoid confusion.
