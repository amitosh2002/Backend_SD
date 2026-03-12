import { commentModel } from "../../models/PlatformModel/commentsModel.js";
import { TicketModel } from "../../models/TicketModels.js";
import User from "../../models/UserModel.js";
import { UserWorkAccess } from "../../models/PlatformModel/UserWorkAccessModel.js";
import { createBulkNotification } from "../../utility/notificationUtility.js";

/**
 * Adds a new comment to a ticket, parses mentions, and sends notifications.
 */
export const addTicketComment = async (req, res) => {
  try {
    const { id: ticketId } = req.params;
    const { comment, mentionedUsers, parentId } = req.body; 
    const authorId = req.user.userId;

    if (!comment || !ticketId) {
      return res.status(400).json({ success: false, message: "Comment and Ticket ID are required." });
    }

    const ticket = await TicketModel.findById(ticketId).select("projectId ticketKey title partnerId").lean();
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found." });
    }

    const newComment = new commentModel({
      projectId: ticket.projectId,
      ticketId: ticketId,
      comment: comment,
      authorId: authorId,
      mentioned: mentionedUsers || [],
      partnerId: ticket.partnerId || "",
      parentId: parentId || null
    });

    await newComment.save();

    // Fetch author details for notifications
    const author = await User.findById(authorId).select("profile username").lean();
    const authorName = author ? `${author.profile?.firstName || ""} ${author.profile?.lastName || ""}`.trim() || author.username : "Someone";
    const authorAvatar = author?.profile?.avatar || null;
    const authorInitials = authorName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().substring(0, 2);

    // 1. Notify mentioned users
    if (mentionedUsers && mentionedUsers.length > 0) {
      // Use Set to ensure unique userIds for notification
      const mentionedIds = [...new Set(mentionedUsers.map(u => u.userId || u.id || u._id))]
        .filter(id => id && id.toString() !== authorId.toString());
      
      if (mentionedIds.length > 0) {
        await createBulkNotification({
          userIds: mentionedIds,
          title: `${ticket.ticketKey}`,
          message: `${authorName} mentioned you in a comment on ${ticket.ticketKey}.`,
          type: 7, 
          priority: 5,
          reference: {
            module: "ticket",
            moduleId: ticketId,
            ticketKey: ticket.ticketKey
          },
          meta: { 
            icon: "at-sign", 
            color: "#3b82f6",
            avatar: authorAvatar,
            initials: authorInitials
          }
        });
      }
    }

    // 2. If it's a reply, notify the parent author
    if (parentId) {
        const parentComment = await commentModel.findById(parentId).select("authorId").lean();
        if (parentComment && parentComment.authorId !== authorId) {
            await createBulkNotification({
                userIds: [parentComment.authorId],
                title: `Reply to your comment`,
                message: `${authorName} replied to your comment on ${ticket.ticketKey}.`,
                type: 7,
                priority: 5,
                reference: {
                    module: "ticket",
                    moduleId: ticketId,
                    ticketKey: ticket.ticketKey
                },
                meta: { 
                    icon: "reply", 
                    color: "#8b5cf6",
                    avatar: authorAvatar,
                    initials: authorInitials
                }
            });
        }
    }

    const augmentedComment = {
      ...newComment.toObject(),
      author: {
        id: authorId,
        name: authorName,
        avatar: author?.profile?.avatar || null,
        username: author?.username
      }
    };

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: augmentedComment
    });

  } catch (error) {
    console.error("Error adding ticket comment:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Updates an existing comment.
 */
export const updateTicketComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { comment, mentionedUsers } = req.body;
    const userId = req.user.userId;

    const existingComment = await commentModel.findById(commentId);
    if (!existingComment) {
      return res.status(404).json({ success: false, message: "Comment not found." });
    }

    if (existingComment.authorId !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized to update this comment." });
    }

    existingComment.comment = comment;
    existingComment.mentioned = mentionedUsers || [];
    existingComment.isEdited = true;
    await existingComment.save();

    // Notify newly mentioned users on edit
    if (mentionedUsers && mentionedUsers.length > 0) {
      const ticket = await TicketModel.findById(existingComment.ticketId).select("ticketKey").lean();
      const author = await User.findById(userId).select("profile username").lean();
      const authorName = author ? `${author.profile?.firstName || ""} ${author.profile?.lastName || ""}`.trim() || author.username : "Someone";
      const authorAvatar = author?.profile?.avatar || null;
      const authorInitials = authorName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().substring(0, 2);

      const mentionedIds = [...new Set(mentionedUsers.map(u => u.userId || u.id || u._id))]
        .filter(id => id && id.toString() !== userId.toString());

      if (mentionedIds.length > 0 && ticket) {
        await createBulkNotification({
          userIds: mentionedIds,
          title: `${ticket.ticketKey}`,
          message: `${authorName} mentioned you in an updated comment on ${ticket.ticketKey}.`,
          type: 7,
          priority: 5,
          reference: {
            module: "ticket",
            moduleId: String(existingComment.ticketId),
            ticketKey: ticket.ticketKey
          },
          meta: { 
            icon: "at-sign", 
            color: "#3b82f6",
            avatar: authorAvatar,
            initials: authorInitials
          }
        });
      }
    }

    return res.status(200).json({ success: true, message: "Comment updated.", data: existingComment });
  } catch (error) {
    console.error("Error updating comment:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

/**
 * Deletes (soft-delete) a comment.
 */
export const deleteTicketComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.userId;

    const existingComment = await commentModel.findById(commentId);
    if (!existingComment) {
      return res.status(404).json({ success: false, message: "Comment not found." });
    }

    if (existingComment.authorId !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this comment." });
    }

    existingComment.isDeleted = true;
    await existingComment.save();

    return res.status(200).json({ success: true, message: "Comment deleted." });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

/**
 * Fetches all comments for a specific ticket with author details.
 */
export const getTicketComments = async (req, res) => {
  try {
    const { id: ticketId } = req.params;

    const comments = await commentModel.find({ ticketId, isDeleted: { $ne: true } })
      .sort({ createdAt: 1 })
      .lean();

    // Hydrate author details
    const authorIds = [...new Set(comments.map(c => c.authorId))];
    const authors = await User.find({ _id: { $in: authorIds } })
      .select("profile username email")
      .lean();

    const commentsWithAuthors = comments.map(comment => {
      const author = authors.find(u => u._id.toString() === comment.authorId);
      return {
        ...comment,
        author: {
          id: author?._id,
          name: author ? `${author.profile?.firstName || ""} ${author.profile?.lastName || ""}`.trim() || author.username : "Unknown User",
          avatar: author?.profile?.avatar || null,
          username: author?.username
        }
      };
    });

    return res.status(200).json({
      success: true,
      comments: commentsWithAuthors
    });

  } catch (error) {
    console.error("Error fetching ticket comments:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Fetches all project members for mention dropdown.
 */
export const getProjectMembersForMentions = async (req, res) => {
    try {
        const { projectId } = req.params;
        const accessRecords = await UserWorkAccess.find({ projectId, status: "accepted" })
          .select("userId accessType")
          .lean();

        const userIds = accessRecords.map(r => r.userId).filter(Boolean);
        const userDetails = await User.find({ _id: { $in: userIds } })
          .select("profile username email")
          .lean();

        const members = userDetails.map(u => ({
            id: u._id,
            name: `${u.profile?.firstName || ""} ${u.profile?.lastName || ""}`.trim() || u.username,
            username: u.username,
            avatar: u.profile?.avatar || null,
        }));

        return res.status(200).json({ success: true, members });
    } catch (error) {
        console.error("Error getting project members for mentions:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
