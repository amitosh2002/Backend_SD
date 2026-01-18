import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const Schema = mongoose.Schema;

const TicketConfigSchema = new Schema({
  // External ID for the ticket config (e.g., from GitHub or generated)
  ticketConfigId: { type: String, default: uuidv4 },
  projectId: { type: String, required: true, ref: 'Projects' },
  // ticketConfigName: { type: String, required: true },

  // 1. Ticket Conventions Array
  conventions: [{
    id: { type: String, default: uuidv4 },
    name: { type: String, required: true },
    suffix: { type: String, required: true }, // e.g., BUG, FEAT
    iconId: { type: String, required: true },
    color: { type: String, default: "#2563eb" }
  }],

  // 2. Ticket Priorities Array
  priorities: [{
    id: { type: String, default: uuidv4 },
    name: { type: String, required: true },
    level: { type: Number, required: true }, // 1-5
    color: { type: String, required: true },
    description: { type: String }
  }],

  // 3. Ticket Labels Array
  labels: [{
    id: { type: String, default: uuidv4 },
    name: { type: String, required: true },
    color: { type: String, required: true },
    description: { type: String }
  }]

}, { timestamps: true });

export const TicketConfig = mongoose.model('TicketConfig', TicketConfigSchema);