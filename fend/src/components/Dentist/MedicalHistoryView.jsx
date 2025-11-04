import React from "react";

export default function MedicalHistoryView({ medicalHistory }) {
  if (!medicalHistory) {
    return (
      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        Medical history has not been completed for this visit.
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatBoolean = (value) => {
    if (value === null || value === undefined) return "Not specified";
    return value ? "Yes" : "No";
  };

  return (
    <div className="medical-history-view" style={{ maxHeight: "70vh", overflowY: "auto" }}>
      {/* Patient Information */}
      <div className="card mb-3">
        <div className="card-header bg-primary text-white">
          <h6 className="mb-0"><i className="bi bi-person me-2"></i>Patient Information</h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-2">
              <strong>Full Name:</strong> {medicalHistory.full_name || "N/A"}
            </div>
            <div className="col-md-3 mb-2">
              <strong>Age:</strong> {medicalHistory.age || "N/A"}
            </div>
            <div className="col-md-3 mb-2">
              <strong>Sex:</strong> {medicalHistory.sex ? medicalHistory.sex.charAt(0).toUpperCase() + medicalHistory.sex.slice(1) : "N/A"}
            </div>
            <div className="col-md-12 mb-2">
              <strong>Address:</strong> {medicalHistory.address || "N/A"}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Contact Number:</strong> {medicalHistory.contact_number || "N/A"}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Email:</strong> {medicalHistory.email || "N/A"}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Occupation:</strong> {medicalHistory.occupation || "N/A"}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Date of Birth:</strong> {formatDate(medicalHistory.date_of_birth)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Previous Dentist:</strong> {medicalHistory.previous_dentist || "N/A"}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Last Dental Visit:</strong> {formatDate(medicalHistory.last_dental_visit)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Physician Name:</strong> {medicalHistory.physician_name || "N/A"}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Physician Address:</strong> {medicalHistory.physician_address || "N/A"}
            </div>
          </div>
        </div>
      </div>

      {/* Health Questions */}
      <div className="card mb-3">
        <div className="card-header bg-info text-white">
          <h6 className="mb-0"><i className="bi bi-heart-pulse me-2"></i>Health Questions</h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-2">
              <strong>In good health:</strong> {formatBoolean(medicalHistory.in_good_health)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Under medical treatment:</strong> {formatBoolean(medicalHistory.under_medical_treatment)}
            </div>
            {medicalHistory.under_medical_treatment && medicalHistory.medical_treatment_details && (
              <div className="col-12 mb-2">
                <strong>Treatment Details:</strong> {medicalHistory.medical_treatment_details}
              </div>
            )}
            <div className="col-md-6 mb-2">
              <strong>Serious illness or surgery:</strong> {formatBoolean(medicalHistory.serious_illness_surgery)}
            </div>
            {medicalHistory.serious_illness_surgery && medicalHistory.illness_surgery_details && (
              <div className="col-12 mb-2">
                <strong>Illness/Surgery Details:</strong> {medicalHistory.illness_surgery_details}
              </div>
            )}
            <div className="col-md-6 mb-2">
              <strong>Hospitalized:</strong> {formatBoolean(medicalHistory.hospitalized)}
            </div>
            {medicalHistory.hospitalized && medicalHistory.hospitalization_details && (
              <div className="col-12 mb-2">
                <strong>Hospitalization Details:</strong> {medicalHistory.hospitalization_details}
              </div>
            )}
            <div className="col-md-6 mb-2">
              <strong>Taking medications:</strong> {formatBoolean(medicalHistory.taking_medications)}
            </div>
            {medicalHistory.taking_medications && medicalHistory.medications_list && (
              <div className="col-12 mb-2">
                <strong>Medications List:</strong> {medicalHistory.medications_list}
              </div>
            )}
            <div className="col-md-6 mb-2">
              <strong>Uses tobacco:</strong> {formatBoolean(medicalHistory.uses_tobacco)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Uses alcohol/drugs:</strong> {formatBoolean(medicalHistory.uses_alcohol_drugs)}
            </div>
          </div>
        </div>
      </div>

      {/* Allergies */}
      <div className="card mb-3">
        <div className="card-header bg-warning text-dark">
          <h6 className="mb-0"><i className="bi bi-exclamation-triangle me-2"></i>Allergies</h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-2">
              <strong>Local Anesthetic:</strong> {formatBoolean(medicalHistory.allergic_local_anesthetic)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Penicillin:</strong> {formatBoolean(medicalHistory.allergic_penicillin)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Sulfa:</strong> {formatBoolean(medicalHistory.allergic_sulfa)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Aspirin:</strong> {formatBoolean(medicalHistory.allergic_aspirin)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Latex:</strong> {formatBoolean(medicalHistory.allergic_latex)}
            </div>
            {medicalHistory.allergic_others && (
              <div className="col-12 mb-2">
                <strong>Other Allergies:</strong> {medicalHistory.allergic_others}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* For Women Only */}
      {(medicalHistory.sex === "female") && (
        <div className="card mb-3">
          <div className="card-header bg-secondary text-white">
            <h6 className="mb-0"><i className="bi bi-gender-female me-2"></i>For Women Only</h6>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-4 mb-2">
                <strong>Pregnant:</strong> {formatBoolean(medicalHistory.is_pregnant)}
              </div>
              <div className="col-md-4 mb-2">
                <strong>Nursing:</strong> {formatBoolean(medicalHistory.is_nursing)}
              </div>
              <div className="col-md-4 mb-2">
                <strong>Taking Birth Control:</strong> {formatBoolean(medicalHistory.taking_birth_control)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vital Information */}
      <div className="card mb-3">
        <div className="card-header bg-danger text-white">
          <h6 className="mb-0"><i className="bi bi-heartbeat me-2"></i>Vital Information</h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4 mb-2">
              <strong>Blood Type:</strong> {medicalHistory.blood_type || "N/A"}
            </div>
            <div className="col-md-4 mb-2">
              <strong>Blood Pressure:</strong> {medicalHistory.blood_pressure || "N/A"}
            </div>
            <div className="col-md-4 mb-2">
              <strong>Bleeding Time:</strong> {medicalHistory.bleeding_time || "N/A"}
            </div>
          </div>
        </div>
      </div>

      {/* Medical Conditions */}
      <div className="card mb-3">
        <div className="card-header bg-dark text-white">
          <h6 className="mb-0"><i className="bi bi-file-medical me-2"></i>Medical Conditions</h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-2">
              <strong>High Blood Pressure:</strong> {formatBoolean(medicalHistory.high_blood_pressure)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Low Blood Pressure:</strong> {formatBoolean(medicalHistory.low_blood_pressure)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Heart Disease:</strong> {formatBoolean(medicalHistory.heart_disease)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Heart Murmur:</strong> {formatBoolean(medicalHistory.heart_murmur)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Chest Pain:</strong> {formatBoolean(medicalHistory.chest_pain)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Stroke:</strong> {formatBoolean(medicalHistory.stroke)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Diabetes:</strong> {formatBoolean(medicalHistory.diabetes)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Hepatitis:</strong> {formatBoolean(medicalHistory.hepatitis)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Tuberculosis:</strong> {formatBoolean(medicalHistory.tuberculosis)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Kidney Disease:</strong> {formatBoolean(medicalHistory.kidney_disease)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Cancer:</strong> {formatBoolean(medicalHistory.cancer)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Asthma:</strong> {formatBoolean(medicalHistory.asthma)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Anemia:</strong> {formatBoolean(medicalHistory.anemia)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Arthritis:</strong> {formatBoolean(medicalHistory.arthritis)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Epilepsy:</strong> {formatBoolean(medicalHistory.epilepsy)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>AIDS/HIV:</strong> {formatBoolean(medicalHistory.aids_hiv)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Stomach Troubles:</strong> {formatBoolean(medicalHistory.stomach_troubles)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Thyroid Problems:</strong> {formatBoolean(medicalHistory.thyroid_problems)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Hay Fever:</strong> {formatBoolean(medicalHistory.hay_fever)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Head Injuries:</strong> {formatBoolean(medicalHistory.head_injuries)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Rapid Weight Loss:</strong> {formatBoolean(medicalHistory.rapid_weight_loss)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Joint Replacement:</strong> {formatBoolean(medicalHistory.joint_replacement)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Radiation Therapy:</strong> {formatBoolean(medicalHistory.radiation_therapy)}
            </div>
            <div className="col-md-6 mb-2">
              <strong>Swollen Ankles:</strong> {formatBoolean(medicalHistory.swollen_ankles)}
            </div>
            {medicalHistory.other_conditions && (
              <div className="col-12 mb-2">
                <strong>Other Conditions:</strong> {medicalHistory.other_conditions}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Completion Info */}
      {medicalHistory.completed_at && (
        <div className="alert alert-success">
          <small>
            <i className="bi bi-check-circle me-2"></i>
            Completed on {formatDate(medicalHistory.completed_at)}
            {medicalHistory.completedBy && ` by ${medicalHistory.completedBy.name || "Staff"}`}
          </small>
        </div>
      )}
    </div>
  );
}
