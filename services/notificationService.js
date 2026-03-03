import { getIO } from "../Socket/socket.js";

export const sendNotification =async (userId, message) => {
    const io = getIO();
    io.to(userId).emit("notification", {
        message: message,
        time: new Date().toISOString()
    });
}



// this is for controlleer less couppling function call 