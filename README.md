# Unified Campus Resources Management System

A web-based campus management platform that provides centralized access to **Lost & Found** services and **Seminar Hall Booking**.

The system reduces manual work by providing a single platform where registered users can report lost or found items, view active reports, claim their own reported lost items, check seminar hall availability, and manage their own bookings.

---

## Features

### 1. User Registration and Login
- Users can create an account using their name, email, and password.
- Passwords are securely hashed using `bcryptjs`.
- Login is protected using JWT authentication.
- User information is stored in MongoDB.

### 2. Lost & Found Management
- Users can report a **Lost** or **Found** item.
- Users can enter:
  - Item name
  - Type
  - Description
  - Location
  - Item image
- Reported items are stored in MongoDB.
- Uploaded images are stored in the `uploads` folder.
- All registered users receive an email notification when a new Lost or Found item is reported.
- All users can view currently active Lost & Found reports.
- Only the person who reported a Lost item can see and use the **Claim** option.
- When the reporter claims the item:
  - A claim history record is stored.
  - The uploaded image is deleted.
  - The original item is deleted from MongoDB.
  - The item disappears automatically from the active records table.
  - All registered users receive a claim notification email.

### 3. Seminar Hall Booking
The system provides three seminar halls:

| Hall | Capacity | Location |
|------|----------|----------|
| Hall A | 100 | Block A |
| Hall B | 60 | Block B |
| Hall C | 150 | Block C |

Users can:
- Select a seminar hall.
- Select a date.
- Select start and end times.
- Enter the purpose of the booking.
- Check hall availability.
- Book an available hall.

The system prevents overlapping bookings for the same hall and time.

After a successful booking:
- The booking is stored in MongoDB.
- The person who booked receives a confirmation email.
- All registered users receive a booking notification.

Only the person who created a booking can see the **Cancel** option.

When the booking owner cancels:
- The booking is deleted from MongoDB.
- The booking disappears automatically from the booking table.
- The hall becomes available again.
- All registered users receive a cancellation notification email.

### 4. Dashboard
The dashboard displays live statistics for:

- Registered Users
- Lost Items
- Found Items
- Claimed Items
- Active Seminar Hall Bookings

The dashboard also provides navigation to:

- Report Lost / Found
- View Lost & Found
- Seminar Hall Booking

---

## Technology Stack

### Frontend
- HTML5
- CSS3
- JavaScript

### Backend
- Node.js
- Express.js

### Database
- MongoDB
- Mongoose

### Authentication
- JSON Web Token (JWT)
- bcryptjs

### File Upload
- Multer

### Email Notifications
- Nodemailer
- Gmail SMTP

### Other
- CORS
- dotenv

---

## Project Structure

```text
RTP/
│
├── models/
│   ├── User.js
│   ├── Item.js
│   ├── Hall.js
│   ├── Booking.js
│   └── Claim.js
│
├── public/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── lost-found.html
│   ├── lost-found-records.html
│   ├── booking.html
│   ├── app.js
│   └── style.css
│
├── uploads/
│   └── uploaded item images
│
├── .env
├── .gitignore
├── package.json
├── package-lock.json
└── server.js
