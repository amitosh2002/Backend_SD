import InAppNotifications from "../models/NotificationModels/NotificationSchema.js";
import { getIO } from "../Socket/socket.js";

/**
 * Create notifications for multiple users and emit socket events
 */
export const createBulkNotification = async ({
  userIds = [],
  title,
  message,
  type,
  reference,
  priority = 8,
  meta = {},
}) => {
  try {
    if (!userIds.length) return [];

    // 1️⃣ Prepare documents
    const notificationsToCreate = userIds.map((userId) => ({
      userId,
      title,
      message,
      type,
      reference,
      priority,
      meta,
      isDeleted: false,
    }));

    // 2️⃣ Insert many
    const notifications = await InAppNotifications.insertMany(
      notificationsToCreate,
      { ordered: false }
    );

    // 3️⃣ Emit socket events (non-blocking)
    try {
      const io = getIO();

      notifications.forEach((notification) => {
        console.log(`Socket: Emitting notification to user ${notification.userId.toString()}`);
        // Emit with all necessary fields for the frontend
        io.to(notification.userId.toString()).emit('notification', {
          id: notification._id,
          notificationId: notification.notificationId || notification._id, // Fallback if not generated yet
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          reference: notification.reference,
          meta: notification.meta,
          status: notification.status !== undefined ? notification.status : false, // Default to false (unread)
          createdAt: notification.createdAt,
        });
      });
    } catch (socketError) {
      console.log('⚠️ Socket emit failed:', socketError.message);
    }

    return notifications;
  } catch (error) {
    console.log('❌ createBulkNotification error:', error);
    return [];
  }
};


export const processChartData = (notifications) => {
  // Mapping provided by you
  const typeMap = {
    1: "Ticket", 2: "Message", 3: "User", 
    4: "Monitor", 5: "User", 6: "Ticket", 7: "User"
  };

  // 1. Data for BAR CHART (Type Distribution)
  const typeCounts = {};
  notifications.forEach(n => {
    const label = typeMap[n.type] || "Other";
    typeCounts[label] = (typeCounts[label] || 0) + 1;
  });
  const barData = Object.keys(typeCounts).map(key => ({
    name: key,
    count: typeCounts[key]
  }));

  // 2. Data for CIRCULAR CHART (Read vs Unread)
  const statusCounts = { Unread: 0, Read: 0 };
  notifications.forEach(n => {
    // Handling both Boolean and Number (0/1) for safety
    if (n.status === 0 || n.status === false) statusCounts.Unread++;
    else statusCounts.Read++;
  });
  const pieData = [
    { name: "Unread", value: statusCounts.Unread, color: "#EF4444" },
    { name: "Read", value: statusCounts.Read, color: "#10B981" }
  ];

  // 3. Data for LINE CHART (Timeline - notifications per day)
  const timeCounts = {};
  notifications.forEach(n => {
    const date = new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    timeCounts[date] = (timeCounts[date] || 0) + 1;
  });
  const lineData = Object.keys(timeCounts).map(date => ({
    date: date,
    count: timeCounts[date]
  })).sort((a, b) => new Date(a.date) - new Date(b.date));

  return { barData, pieData, lineData };
};
