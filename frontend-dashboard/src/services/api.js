import axios from 'axios';

//points frontend to the backend server
const API_BASE_URL = 'http://localhost:3000/api'; 

export const fetchAllAlerts = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/alerts`);
    
    //we map _id to id for React
    return response.data.map(item => ({
      ...item,
      id: item._id, 
      report_details: item.dispatchMessage 
    }));
  } catch (error) {
    console.error("Error fetching alerts from Sauti Porini cloud:", error);
    return []; 
  }
};