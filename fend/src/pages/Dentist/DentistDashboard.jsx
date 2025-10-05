import VisitCodeInput from "../../components/Dentist/VisitCodeInput";
import { useAuth } from "../../hooks/useAuth";

const DentistDashboard = () => {
  const { user } = useAuth();
  return (
    <div>
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2>🦷 Dentist Dashboard</h2>
              <div className="text-muted">
                Welcome, Dr. {user?.name || 'Dentist'}
              </div>
            </div>
            
            <div className="alert alert-info">
              <h5>How to use Visit Codes:</h5>
              <ol>
                <li>Staff will provide you with a 6-character visit code</li>
                <li>Enter the code below to start the consultation</li>
                <li>Review patient information and history</li>
                <li>Enter your notes, findings, and treatment plan</li>
                <li>Save your notes - staff can access them during completion</li>
              </ol>
            </div>
            
            <VisitCodeInput />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DentistDashboard;
