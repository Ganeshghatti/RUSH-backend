## Online Appointment
##### step-1: patient create a request(pending state) - money get freezed
##### step-2: doctor accepts online appointment + twilio room is created.
##### step-3: when doctor enter the pre-room -> create accesstoken
##### step-4: when doctor enters the twilio-room -> intiate the api for final payment -> but do not mark the appointment status as completed.


## Emergency Appointment
##### step-1: patient create an emergency appointment, their 2500 get freezed.
##### step-2: doctor accepts emergency appointment + twilio room is created.
##### step-3: when doctor enter the twilio-room -> create accesstoken -> intiate the api for final payment -> but do not mark the appointment status as completed.

## Clinic Appointment
##### step-1: patient create a request(pending state) - money get freezed
##### step-2: when doctor accept the request , otp is created
##### step-3: when otp is validated -> final payment is processed

## HomeVisit Appointment
##### step-1: Patient creates home visit request with fixed cost only.
##### step-2: doctor accepts and add travel cost.
##### step-3: patient accepts the appointment -> totalCost is frozen from patient's user wallet.
##### step-4: when otp is validated then final payment is processed.

