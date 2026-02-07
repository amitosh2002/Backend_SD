const GlobalNotificationSettingsSchema = new mongoose.Schema(
  {
    // Singleton identifier
    key: {
      type: String,
      default: "GLOBAL_NOTIFICATION_SETTINGS",
      unique: true,
      immutable: true
    },

    // GLOBAL MASTER SWITCH
    enabled: {
      type: Boolean,
      default: true
    },

    // CHANNEL AVAILABILITY
    channels: {
      email: {
        enabled: { type: Boolean, default: true },
        provider: { type: String, default: "SMTP" } // SMTP, SES, Sendgrid
      },

      push: {
        enabled: { type: Boolean, default: true },
        provider: { type: String, default: "ONESIGNAL" }
      },

      inApp: {
        enabled: { type: Boolean, default: true }
      }
    },

    // DEFAULT USER PREFERENCES (applied on signup)
    defaults: {
      email: {
        enabled: { type: Boolean, default: true },
        directMessages: { type: Boolean, default: true },
        ticketUpdates: { type: Boolean, default: true },
        teamUpdates: { type: Boolean, default: true },
        payments: { type: Boolean, default: true },
        systemAlerts: { type: Boolean, default: true }
      },

      push: {
        enabled: { type: Boolean, default: true },
        directMessages: { type: Boolean, default: true },
        ticketUpdates: { type: Boolean, default: true },
        teamUpdates: { type: Boolean, default: true },
        integrationAlerts: { type: Boolean, default: true }
      },

      newsAndUpdates: {
        enabled: { type: Boolean, default: false }
      },

      feedbackNotifications: {
        enabled: { type: Boolean, default: true }
      }
    },

    // FEATURE TOGGLES
    features: {
      newsAndUpdates: { type: Boolean, default: true },
      feedbackNotifications: { type: Boolean, default: true },
      integrationAlerts: { type: Boolean, default: true },
      paymentNotifications: { type: Boolean, default: true }
    },

    // GLOBAL QUIET HOURS (emergency / compliance)
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String }, // "22:00"
      end: { type: String }    // "08:00"
    },

    // MAINTENANCE / INCIDENT MODE
    maintenanceMode: {
      enabled: { type: Boolean, default: false },
      message: { type: String }
    }
  },
  {
    timestamps: true
  }
);
export default mongoose.model("GlobalNotificationSettingsSchema", GlobalNotificationSettingsSchema);
