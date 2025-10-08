export const createKeyValuePair = async (req, res) => {
    try {
        const { key, value, dataPair } = req.body;
        if (!key || !value) {
        return res.status(400).json({ message: "Key and value are required" });
        }
        const existing = await KeyValueModel.findOne({ key });
        if (existing) {
        return res.status(409).json({ message: "Key already exists" });
        }
        const newPair = new KeyValueModel({ key, value, dataPair });
        await newPair.save();
        return res.status(201).json(newPair);
    } catch (err) {
        console.error("Error creating key-value pair:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
    }
export const getValueByKey = async (req, res) => {
    try {
        const { key } = req.params;
        const pair = await KeyValueModel.find({ key });
        if (!pair) {    
        return res.status(404).json({ message: "Key not found" });
        }
        return res.status(200).json(pair);}
    

    catch (err) {
        console.error("Error retrieving value by key:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}
export const updateValueByKey = async (req, res) => {
    try {
        const { key } = req.params;
        const { value, dataPair } = req.body;
        const updated = await KeyValueModel.findOneAndUpdate(
        { key },
        { value, dataPair },
        { new: true, runValidators: true }
        );
        if (!updated) {
        return res.status(404).json({ message: "Key not found" });
        }
        return res.status(200).json(updated);
    } catch (err) {
        console.error("Error updating value by key:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const deleteKeyValuePair = async (req, res) => {
  try {
    const { key } = req.params;
    const deleted = await KeyValueModel.findOneAndDelete({ key });
    if (!deleted) {
      return res.status(404).json({ message: "Key not found" });
    }
    return res.status(200).json({ message: "Key-value pair deleted" });
  } catch (err) {
    console.error("Error deleting key-value pair:", err);

    return res.status(500).json({ message: "Internal server error" });
  }
}

export const listAllKeyValuePairs = async (req, res) => {
  try {
    const pairs = await KeyValueModel.find({});
    return res.status(200).json(pairs);
  } catch (err) {
    console.error("Error listing all key-value pairs:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//temp Controller for ticket type: 
const TICKET_TYPES = [
  "ARCH",
  "BUG",
  "FEATURE",
  "TASK",
  "STORY",
  "EPIC",
  "IMPROVEMENT",
  "SUBTASK",
  "TEST",
  "DOCUMENTATION",
  // Custom/portfolio types
  "LIVEOPS",
  "PLAT",
];

const Ticket_Types=[
    {
        type:"Bug",
        icon:"https://res.cloudinary.com/duzffecme/image/upload/v1756308073/bug_wtl3z3.svg"
    },
    {
        type:"task",
        icon:"https://res.cloudinary.com/duzffecme/image/upload/v1756308395/taskIcon_kps7f4.svg"
    
    },
    {
        type:"Arch",
        icon:"https://res.cloudinary.com/duzffecme/image/upload/v1756308633/architecture-svgrepo-com_ml0sbh.svg"
    },
    {
        type:"subTask",
        icon:"https://res.cloudinary.com/duzffecme/image/upload/v1756308807/tick-square-svgrepo-com_jhbphs.svg"
    }
]
const ticket_statuses = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "DEV_TESTING",
  "QA TESTING",
  "READY_FOR_DEPLOYMENT",
  "DEPLOYED",
  "ON_HOLD",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "M1 TESTING COMPLETED",
  "M2 TESTING COMPLETED",
]  
export const platformKeyValuesPairs = (req, res) => {
    if (Ticket_Types.length === 0 || ticket_statuses.length === 0) {
        return res.status(404).json({ message: "No ticket types found or No ticket statuses found" });
    }
    
    return res.status(200).json({
        ticketTypes: Ticket_Types, 
        ticketStatuses: ticket_statuses 
    });
};