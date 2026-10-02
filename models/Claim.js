const mongoose = require("mongoose");

const claimSchema = new mongoose.Schema(
    {
        itemName: {
            type: String,
            required: true
        },

        itemType: {
            type: String,
            enum: ["Lost", "Found"],
            required: true
        },

        description: {
            type: String,
            default: ""
        },

        location: {
            type: String,
            default: ""
        },

        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        claimedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        claimedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Claim", claimSchema);