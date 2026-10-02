require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");

const User = require("./models/User");
const Item = require("./models/Item");
const Hall = require("./models/Hall");
const Booking = require("./models/Booking");
const Claim = require("./models/Claim");

const app = express();

/* =====================================================
   BASIC CONFIGURATION
===================================================== */

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

/* =====================================================
   UPLOAD FOLDER
===================================================== */

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true
  });
}

app.use(
  "/uploads",
  express.static(uploadDir)
);

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

/* =====================================================
   MONGODB CONNECTION
===================================================== */

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {

    console.log(
      "MongoDB connected successfully"
    );


    /* ONLY 3 SEMINAR HALLS */

    const requiredHalls = [

      {
        name: "Hall A",
        capacity: 100,
        location: "Block A"
      },

      {
        name: "Hall B",
        capacity: 60,
        location: "Block B"
      },

      {
        name: "Hall C",
        capacity: 150,
        location: "Block C"
      }

    ];


    /* CREATE MISSING HALLS */

    for (const hallData of requiredHalls) {

      const existingHall =
        await Hall.findOne({
          name: hallData.name
        });


      if (!existingHall) {

        await Hall.create(
          hallData
        );

        console.log(
          `${hallData.name} created`
        );

      }

    }


    console.log(
      "Hall A, Hall B and Hall C are ready"
    );

  })
  .catch((error) => {

    console.error(
      "MongoDB connection error:",
      error
    );

  });
/* =====================================================
   EMAIL CONFIGURATION
===================================================== */

const transporter =
  nodemailer.createTransport({
    service: "gmail",

    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

/* =====================================================
   SEND EMAIL TO ALL REGISTERED USERS
===================================================== */

async function sendEmailToAllUsers(subject, html) {

    try {

        const users =
            await User.find({}, "email");

        const emails =
            users
                .map(user => user.email)
                .filter(Boolean);


        if (emails.length === 0) {

            console.log(
                "No registered users for email notification."
            );

            return;

        }


        await transporter.sendMail({

            from:
                `"Campus Resources System" <${process.env.EMAIL_USER}>`,

            to:
                process.env.EMAIL_USER,

            bcc:
                emails,

            subject:
                subject,

            html:
                html

        });


        console.log(
            `Notification sent to ${emails.length} registered users`
        );

    } catch (error) {

        console.error(
            "Email notification error:",
            error.message
        );

    }

}

/* =====================================================
   BOOKING CONFIRMATION EMAIL
===================================================== */

async function sendBookingEmail(
  user,
  booking,
  hall
) {
  try {
    await transporter.sendMail({
      from:
        `"Campus Resources System" <${process.env.EMAIL_USER}>`,

      to: user.email,

      subject:
        "Seminar Hall Booking Confirmation",

      html: `
        <div style="
          font-family:Arial;
          padding:25px;
          background:#f5f7fb;
        ">

          <div style="
            max-width:600px;
            margin:auto;
            background:white;
            padding:25px;
            border-radius:12px;
          ">

            <h2 style="color:#2563eb;">
              Seminar Hall Booking Confirmed
            </h2>

            <p>
              Hello <b>${user.name}</b>,
            </p>

            <p>
              Your seminar hall has been
              successfully booked.
            </p>

            <table
              border="1"
              cellpadding="12"
              cellspacing="0"
              width="100%"
              style="border-collapse:collapse;"
            >

              <tr>
                <td><b>Hall</b></td>
                <td>${hall.name}</td>
              </tr>

              <tr>
                <td><b>Capacity</b></td>
                <td>${hall.capacity}</td>
              </tr>

              <tr>
                <td><b>Location</b></td>
                <td>${hall.location}</td>
              </tr>

              <tr>
                <td><b>Date</b></td>
                <td>${booking.date}</td>
              </tr>

              <tr>
                <td><b>Time</b></td>
                <td>
                  ${booking.startTime}
                  -
                  ${booking.endTime}
                </td>
              </tr>

              <tr>
                <td><b>Purpose</b></td>
                <td>${booking.purpose}</td>
              </tr>

              <tr>
                <td><b>Status</b></td>
                <td>Confirmed</td>
              </tr>

            </table>

            <p>
              Thank you for using the
              Unified Campus Resources
              Management System.
            </p>

          </div>

        </div>
      `
    });

    console.log(
      "Booking confirmation email sent"
    );
  } catch (error) {
    console.error(
      "Booking email error:",
      error.message
    );
  }
}

/* =====================================================
   MULTER IMAGE UPLOAD
===================================================== */

const storage =
  multer.diskStorage({

    destination:
      function (
        req,
        file,
        cb
      ) {
        cb(null, uploadDir);
      },

    filename:
      function (
        req,
        file,
        cb
      ) {

        const extension =
          path.extname(
            file.originalname
          );

        const filename =
          Date.now() +
          "-" +
          Math.round(
            Math.random() * 1000000
          ) +
          extension;

        cb(
          null,
          filename
        );
      }
  });

const upload =
  multer({

    storage,

    limits: {
      fileSize:
        5 * 1024 * 1024
    },

    fileFilter:
      function (
        req,
        file,
        cb
      ) {

        const allowed = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp"
        ];

        if (
          allowed.includes(
            file.mimetype
          )
        ) {
          cb(null, true);
        } else {
          cb(
            new Error(
              "Only JPG, JPEG, PNG and WEBP images are allowed"
            )
          );
        }
      }
  });

/* =====================================================
   AUTHENTICATION MIDDLEWARE
===================================================== */

function authenticate(
  req,
  res,
  next
) {

  const header =
    req.headers.authorization;

  if (!header) {
    return res.status(401).json({
      message:
        "Login required"
    });
  }

  const parts =
    header.split(" ");

  const token =
    parts[1];

  if (!token) {
    return res.status(401).json({
      message:
        "Invalid token"
    });
  }

  try {

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    req.user =
      decoded;

    next();

  } catch (error) {

    return res.status(401).json({
      message:
        "Token expired or invalid"
    });
  }
}

/* =====================================================
   HOME
===================================================== */

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );

});

/* =====================================================
   REGISTER
===================================================== */

app.post(
  "/api/register",
  async (req, res) => {

    try {

      const {
        name,
        email,
        password,
        role
      } = req.body;

      if (
        !name ||
        !email ||
        !password
      ) {

        return res.status(400).json({
          message:
            "All fields are required"
        });

      }

      const cleanEmail =
        email
          .trim()
          .toLowerCase();

      const existingUser =
        await User.findOne({
          email: cleanEmail
        });

      if (existingUser) {

        return res.status(400).json({
          message:
            "Email already registered"
        });

      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      const user =
        await User.create({

          name:
            name.trim(),

          email:
            cleanEmail,

          password:
            hashedPassword,

          role:
            role || "Student"

        });

      res.status(201).json({

        message:
          "Registration successful",

        user: {
          id:
            user._id,

          name:
            user.name,

          email:
            user.email,

          role:
            user.role
        }

      });

    } catch (error) {

      console.error(
        "Registration error:",
        error
      );

      res.status(500).json({
        message:
          "Registration failed"
      });

    }
  }
);

/* =====================================================
   LOGIN
===================================================== */

app.post(
  "/api/login",
  async (req, res) => {

    try {

      const {
        email,
        password
      } = req.body;

      if (
        !email ||
        !password
      ) {

        return res.status(400).json({
          message:
            "Email and password are required"
        });

      }

      const user =
        await User.findOne({
          email:
            email
              .trim()
              .toLowerCase()
        });

      if (!user) {

        return res.status(401).json({
          message:
            "Invalid email or password"
        });

      }

      const validPassword =
        await bcrypt.compare(
          password,
          user.password
        );

      if (!validPassword) {

        return res.status(401).json({
          message:
            "Invalid email or password"
        });

      }

      const token =
        jwt.sign(
          {
            id:
              user._id,

            name:
              user.name,

            email:
              user.email,

            role:
              user.role
          },

          process.env.JWT_SECRET,

          {
            expiresIn:
              "7d"
          }
        );

      res.json({

        message:
          "Login successful",

        token,

        user: {
          id:
            user._id,

          name:
            user.name,

          email:
            user.email,

          role:
            user.role
        }

      });

    } catch (error) {

      console.error(
        "Login error:",
        error
      );

      res.status(500).json({
        message:
          "Login failed"
      });

    }
  }
);

/* =====================================================
   REGISTERED USER COUNT
===================================================== */

app.get(
  "/api/users/count",
  async (req, res) => {

    try {

      const count =
        await User.countDocuments();

      res.json({
        count
      });

    } catch (error) {

      res.status(500).json({
        message:
          "Unable to get user count"
      });

    }
  }
);

/* =====================================================
   DASHBOARD STATISTICS
===================================================== */

app.get(
    "/api/dashboard/stats",
    async (req, res) => {

        try {

            const registeredUsers =
                await User.countDocuments();


            const lostItems =
                await Item.countDocuments({
                    type: "Lost",
                    status: "Lost"
                });


            const foundItems =
                await Item.countDocuments({
                    type: "Found",
                    status: "Found"
                });


            const claimedItems =
                await Claim.countDocuments();


            const activeBookings =
                await Booking.countDocuments({
                    status: "Confirmed"
                });


            console.log("Dashboard statistics:", {
                registeredUsers,
                lostItems,
                foundItems,
                claimedItems,
                activeBookings
            });


            res.json({
                registeredUsers,
                lostItems,
                foundItems,
                claimedItems,
                activeBookings
            });


        } catch (error) {

            console.error(
                "Dashboard stats error:",
                error
            );


            res.status(500).json({
                message:
                    "Unable to load dashboard statistics",
                error:
                    error.message
            });

        }

    }
);
/* =====================================================
   CURRENT USER
===================================================== */

app.get(
  "/api/me",
  authenticate,
  async (req, res) => {

    try {

      const user =
        await User.findById(
          req.user.id
        ).select("-password");

      if (!user) {

        return res.status(404).json({
          message:
            "User not found"
        });

      }

      res.json(user);

    } catch (error) {

      res.status(500).json({
        message:
          "Unable to load profile"
      });

    }
  }
);

/* =====================================================
   CREATE LOST / FOUND ITEM
===================================================== */

app.post(
    "/api/items",
    authenticate,
    upload.single("image"),
    async (req, res) => {

        try {

            const {
                itemName,
                type,
                description,
                location
            } = req.body;


            if (
                !itemName ||
                !type ||
                !description ||
                !location
            ) {

                return res.status(400).json({
                    message: "Please fill all fields"
                });

            }


            const item =
                await Item.create({

                    itemName,
                    type,
                    description,
                    location,

                    image:
                        req.file
                        ? `/uploads/${req.file.filename}`
                        : "",

                    status:
                        type,

                    reportedBy:
                        req.user.id

                });


            const reportType =
                type === "Lost"
                ? "Lost"
                : "Found";


            await sendEmailToAllUsers(

                `New ${reportType} Item Reported`,

                `
                <h2>New ${reportType} Item Reported</h2>

                <p>
                    A new ${reportType.toLowerCase()}
                    item has been reported.
                </p>

                <p>
                    <b>Item:</b>
                    ${itemName}
                </p>

                <p>
                    <b>Description:</b>
                    ${description}
                </p>

                <p>
                    <b>Location:</b>
                    ${location}
                </p>

                <p>
                    Please open the Campus Resources System
                    to view the complete details.
                </p>
                `

            );


            res.status(201).json({

                message:
                    `${reportType} item reported successfully`,

                item

            });


        } catch (error) {

            console.error(
                "Create item error:",
                error
            );

            res.status(500).json({

                message:
                    "Unable to report item"

            });

        }

    }
);

/* =====================================================
   GET LOST / FOUND ITEMS
===================================================== */

app.get("/api/items", authenticate, async (req, res) => {

    try {

        const items = await Item.find({
            status: {
                $ne: "Claimed"
            }
        })
        .populate("reportedBy", "name email")
        .sort({ createdAt: -1 });

        res.json(items);

    } catch (error) {

        console.error(
            "Get items error:",
            error
        );

        res.status(500).json({
            message: "Unable to load lost and found items"
        });

    }

});
/* =====================================================
   CLAIM ITEM
===================================================== */

app.put(
    "/api/items/:id/claim",
    authenticate,
    async (req, res) => {

        try {

            const item = await Item.findById(
                req.params.id
            ).populate(
                "reportedBy",
                "name email"
            );


            if (!item) {

                return res.status(404).json({
                    message: "Item not found"
                });

            }
            /* =====================================================
   ONLY THE PERSON WHO REPORTED A LOST ITEM CAN CLAIM IT
===================================================== */

if (
    item.type === "Lost" &&
    String(item.reportedBy._id) !==
    String(req.user.id)
) {

    return res.status(403).json({

        message:
            "Only the person who reported this lost item can claim it"

    });

}


            const itemName = item.itemName;
            const itemType = item.type;

            const reportedBy =
                item.reportedBy
                    ? item.reportedBy.name
                    : "Unknown";


            /* DELETE IMAGE */

            if (item.image) {

                const imageFileName =
                    path.basename(item.image);

                const imagePath =
    path.join(
        uploadDir,
        imageFileName
    );


                if (fs.existsSync(imagePath)) {

                    fs.unlinkSync(imagePath);

                }

            }


            /* =====================================================
   STORE CLAIM HISTORY BEFORE DELETE
===================================================== */

await Claim.create({

    itemName:
        item.itemName,

    itemType:
        item.type,

    description:
        item.description,

    location:
        item.location,

    reportedBy:
        item.reportedBy._id,

    claimedBy:
        req.user.id,

    claimedAt:
        new Date()

});


/* =====================================================
   DELETE IMAGE
===================================================== */

if (item.image) {

    const imageFileName =
        path.basename(item.image);

    const imagePath =
        path.join(
            uploadDir,
            imageFileName
        );

    if (fs.existsSync(imagePath)) {

        fs.unlinkSync(imagePath);

    }

}


/* =====================================================
   DELETE ITEM FROM MONGODB
===================================================== */

await Item.findByIdAndDelete(
    req.params.id
);


            /* EMAIL ALL REGISTERED USERS */

            await sendEmailToAllUsers(
                `Item Claimed - ${itemName}`,
                `
                <h2>Lost & Found Item Claimed</h2>

                <p>
                    A reported item has been claimed.
                </p>

                <p>
                    <b>Item:</b> ${itemName}
                </p>

                <p>
                    <b>Type:</b> ${itemType}
                </p>

                <p>
                    <b>Reported By:</b> ${reportedBy}
                </p>

                <p>
                    The item has been removed from the
                    Lost & Found records.
                </p>
                `
            );


            res.json({
                message:
                    "Item claimed successfully and automatically deleted"
            });


        } catch (error) {

            console.error(
                "Claim item error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to claim item"
            });

        }

    }
);


/* =====================================================
   GET ONLY 3 SEMINAR HALLS
===================================================== */

app.get(
    "/api/halls",
    authenticate,
    async (req, res) => {

        try {

            const halls =
                await Hall.find({
                    name: {
                        $in: [
                            "Hall A",
                            "Hall B",
                            "Hall C"
                        ]
                    }
                })
                .sort({
                    name: 1
                });


            res.json(halls);


        } catch (error) {

            console.error(
                "Get halls error:",
                error
            );


            res.status(500).json({

                message:
                    "Unable to load halls"

            });

        }

    }
);


/* =====================================================
   CHECK SELECTED HALL AVAILABILITY
===================================================== */

app.post(
    "/api/halls/check-availability",
    authenticate,
    async (req, res) => {

        try {

            const {
                hallId,
                date,
                startTime,
                endTime
            } = req.body;


            if (
                !hallId ||
                !date ||
                !startTime ||
                !endTime
            ) {

                return res.status(400).json({

                    message:
                        "Hall, date, start time and end time are required"

                });

            }


            if (
                startTime >= endTime
            ) {

                return res.status(400).json({

                    message:
                        "End time must be after start time"

                });

            }


            const hall =
                await Hall.findById(hallId);


            if (!hall) {

                return res.status(404).json({

                    message:
                        "Hall not found"

                });

            }


            const conflict =
                await Booking.findOne({

                    hall:
                        hallId,

                    date,

                    status:
                        "Confirmed",

                    startTime: {
                        $lt:
                            endTime
                    },

                    endTime: {
                        $gt:
                            startTime
                    }

                });


            res.json({

                available:
                    !conflict,

                hall: {
                    _id:
                        hall._id,

                    name:
                        hall.name,

                    capacity:
                        hall.capacity,

                    location:
                        hall.location
                }

            });


        } catch (error) {

            console.error(
                "Availability error:",
                error
            );


            res.status(500).json({

                message:
                    "Unable to check hall availability"

            });

        }

    }
);

/* =====================================================
   CREATE BOOKING
===================================================== */

app.post(
  "/api/bookings",
  authenticate,

  async (req, res) => {

    try {

      const {
        hallId,
        date,
        startTime,
        endTime,
        purpose
      } = req.body;

      if (
        !hallId ||
        !date ||
        !startTime ||
        !endTime ||
        !purpose
      ) {

        return res.status(400).json({
          message:
            "All booking fields are required"
        });

      }

      if (
        startTime >= endTime
      ) {

        return res.status(400).json({
          message:
            "End time must be after start time"
        });

      }

      const hall =
        await Hall.findById(
          hallId
        );

      if (!hall) {

        return res.status(404).json({
          message:
            "Hall not found"
        });

      }

      const conflict =
        await Booking.findOne({

          hall:
            hallId,

          date,

          status:
            "Confirmed",

          startTime: {
            $lt:
              endTime
          },

          endTime: {
            $gt:
              startTime
          }

        });

      if (conflict) {

        return res.status(409).json({
          message:
            "This hall is already booked for the selected time"
        });

      }

      const booking =
        await Booking.create({

          hall:
            hallId,

          user:
            req.user.id,

          date,

          startTime,

          endTime,

          purpose:
            purpose.trim(),

          status:
            "Confirmed"

        });

      const populatedBooking =
        await Booking.findById(
          booking._id
        )

          .populate(
            "hall"
          )

          .populate(
            "user",
            "name email"
          );

      await sendBookingEmail(
        populatedBooking.user,
        populatedBooking,
        populatedBooking.hall
      );
      /* ================================================
   EMAIL NOTIFICATION TO ALL REGISTERED USERS
================================================ */

await sendEmailToAllUsers(

  "New Seminar Hall Booking",

  `
  <h2>New Seminar Hall Booking</h2>

  <p>
      A seminar hall has been booked.
  </p>

  <p>
      <b>Hall:</b>
      ${populatedBooking.hall.name}
  </p>

  <p>
      <b>Date:</b>
      ${populatedBooking.date}
  </p>

  <p>
      <b>Time:</b>
      ${populatedBooking.startTime}
      -
      ${populatedBooking.endTime}
  </p>

  <p>
      <b>Purpose:</b>
      ${populatedBooking.purpose}
  </p>

  <p>
      <b>Booked By:</b>
      ${populatedBooking.user.name}
  </p>

  <p>
      <b>Status:</b> Confirmed
  </p>

  <p>
      Please check the Campus Resources System
      for the complete booking details.
  </p>
  `

);

      res.status(201).json({

        message:
          "Seminar hall booked successfully",

        booking:
          populatedBooking

      });

    } catch (error) {

      console.error(
        "Booking error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to book hall"
      });

    }
  }
);

/* =====================================================
   MY BOOKINGS
===================================================== */

app.get(
  "/api/my-bookings",
  authenticate,

  async (req, res) => {

    try {

      const bookings =
        await Booking.find({
          user:
            req.user.id
        })

          .populate(
            "hall"
          )

          .populate(
            "user",
            "name email"
          )

          .sort({
            date: 1,
            startTime: 1
          });

      res.json(bookings);

    } catch (error) {

      res.status(500).json({
        message:
          "Unable to load your bookings"
      });

    }
  }
);

/* =====================================================
   ALL BOOKINGS
===================================================== */

app.get("/api/all-bookings", authenticate, async (req, res) => {

    try {

        const bookings = await Booking.find({
            status: {
                $ne: "Cancelled"
            }
        })
        .populate(
            "hall",
            "name capacity location"
        )
        .populate(
            "user",
            "name email"
        )
        .sort({
            createdAt: -1
        });


        res.json(bookings);

    } catch (error) {

        console.error(
            "Get all bookings error:",
            error
        );

        res.status(500).json({
            message:
                "Unable to load booking details"
        });

    }

});

/* =====================================================
   CANCEL BOOKING
===================================================== */

app.put(
    "/api/bookings/:id/cancel",
    authenticate,
    async (req, res) => {

        try {

            const booking =
                await Booking.findById(
                    req.params.id
                )
                .populate(
                    "hall",
                    "name capacity location"
                )
                .populate(
                    "user",
                    "name email"
                );


            if (!booking) {

                return res.status(404).json({
                    message: "Booking not found"
                });

            }


            /* Only owner can cancel */

            if (
                booking.user._id.toString() !==
                req.user.id.toString()
            ) {

                return res.status(403).json({
                    message:
                        "You can cancel only your own booking"
                });

            }


            const hallName =
                booking.hall.name;

            const date =
                booking.date;

            const startTime =
                booking.startTime;

            const endTime =
                booking.endTime;

            const bookedBy =
                booking.user.name;


            /* DELETE BOOKING FROM MONGODB */

            await Booking.findByIdAndDelete(
                req.params.id
            );


            /* EMAIL ALL REGISTERED USERS */

            await sendEmailToAllUsers(
                "Seminar Hall Booking Cancelled",
                `
                <h2>Seminar Hall Booking Cancelled</h2>

                <p>
                    A seminar hall booking has been cancelled.
                </p>

                <p>
                    <b>Hall:</b> ${hallName}
                </p>

                <p>
                    <b>Date:</b> ${date}
                </p>

                <p>
                    <b>Time:</b>
                    ${startTime} - ${endTime}
                </p>

                <p>
                    <b>Booked By:</b> ${bookedBy}
                </p>

                <p>
                    The booking has been removed and
                    the hall is available again.
                </p>
                `
            );


            res.json({
                message:
                    "Seminar hall booking cancelled and automatically deleted"
            });


        } catch (error) {

            console.error(
                "Cancel booking error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to cancel booking"
            });

        }

    }
);

/* =====================================================
   TEST EMAIL
===================================================== */

app.get(
  "/api/test-email",
  authenticate,

  async (req, res) => {

    try {

      await transporter.sendMail({

        from:
          `"Campus Resources System" <${process.env.EMAIL_USER}>`,

        to:
          req.user.email,

        subject:
          "Campus Resources System Test Email",

        html: `
          <h2>Email Test Successful</h2>

          <p>
            Hello ${req.user.name},
          </p>

          <p>
            Your Gmail notification
            system is working successfully.
          </p>
        `

      });

      res.json({
        message:
          "Test email sent successfully"
      });

    } catch (error) {

      console.error(
        "Test email error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to send test email"
      });

    }
  }
);

/* =====================================================
   MULTER / GENERAL ERROR HANDLER
===================================================== */

app.use(
  (error, req, res, next) => {

    console.error(
      "Server error:",
      error
    );

    res.status(500).json({

      message:
        error.message ||
        "Something went wrong"

    });

  }
);

/* =====================================================
   START SERVER
===================================================== */

const PORT =
  process.env.PORT || 5000;

app.listen(
  PORT,
  () => {

    console.log(
      `Server running at http://localhost:${PORT}`
    );

  }
);