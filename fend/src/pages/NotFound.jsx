import { Link } from "react-router-dom";
import "./LandingPage.css";
import kreativeLogo from "./logo.png";

function NotFound() {
  return (
    <div className="landing-page">
      <header className="site-header shadow-sm">
        <div className="container d-flex justify-content-between align-items-center py-2 py-md-3">
          <div className="d-flex align-items-center">
            <img
              src={kreativeLogo}
              alt="Kreative Dental Logo"
              className="site-logo me-2"
            />
            <span className="logo-text">Kreative Dental Clinic</span>
          </div>
          <nav className="d-none d-md-block">
            <ul className="nav-list d-flex gap-2 gap-lg-3 mb-0">
              <li><a className="nav-link" href="/#home">Home</a></li>
              <li><a className="nav-link" href="/#services">Services</a></li>
              <li><a className="nav-link" href="/#about">About</a></li>
              <li><a className="nav-link" href="/#contact">Contact</a></li>
            </ul>
          </nav>
        </div>
      </header>

      <section className="hero-section d-flex align-items-center text-white">
        <div className="container text-center px-3 px-md-4">
          <h1 className="hero-title mb-3 mb-md-4">Oops! Page not found.</h1>
          <p className="hero-subtitle mb-4 mb-md-5">
            The page you are looking for may have moved or no longer exists.
          </p>
          <div className="hero-buttons mt-4 d-flex flex-column flex-sm-row justify-content-center align-items-center gap-2 gap-md-3">
            <Link to="/" className="btn btn-light btn-lg shadow w-100 w-sm-auto px-4">
              Back to Home
            </Link>
            <Link to="/login" className="btn btn-outline-light btn-lg w-100 w-sm-auto px-4">
              Login
            </Link>
            <Link to="/register" className="btn btn-outline-light btn-lg w-100 w-sm-auto px-4">
              Register
            </Link>
          </div>
        </div>
      </section>

      <footer className="text-center py-3 py-md-4 bg-primary text-white">
        <div className="container px-3 px-md-4">
          <p className="mb-0 small">
            &copy; {new Date().getFullYear()} Kreative Dental Clinic. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default NotFound;

