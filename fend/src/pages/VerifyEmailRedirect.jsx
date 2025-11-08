import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";

function VerifyEmailRedirect() {
  const { id, hash } = useParams();
  const location = useLocation();

  useEffect(() => {
    if (!id || !hash) {
      return;
    }

    const search = location.search || "";
    // Force a full reload so Laravel can process the signed URL verification.
    window.location.replace(`/verify-email/${id}/${hash}${search}`);
  }, [hash, id, location.search]);

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
      <LoadingSpinner message="Verifying your email..." />
    </div>
  );
}

export default VerifyEmailRedirect;

