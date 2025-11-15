// Fetch otp table
import otpModel from'../../models/AuthModels/otpModels.js'
import User from '../../models/UserModel.js';
export const fetchOtpTable=async(req,res)=>{
    try{
        const otpData =await otpModel.find();


        return res.status(200).json({
            success:true,
            data:otpData
        })
    }
    catch(error){
        console.error("Error fetching otp data:", error);
        return res.status(500).json({
            success:false,
            msg:"Internal server error",
            error:error.message
        })
    }
}

export const fetchUserTable = async (req,res)=>{
    try {
        const userTable=await User.find();
        return res.status(200).json({
            success:true,
            data:userTable
        })
    } catch (error) {
         console.error("Error fetching otp data:", error);
        return res.status(500).json({
            success:false,
            msg:"Internal server error",
            error:error.message
        })
        
    }
}