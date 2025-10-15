import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "../components/LoadingSpinner";
import ServicesAndPromos from "../components/ServicesAndPromos";
import "./LandingPage.css";
import kreativeLogo from "./logo.png"; 


function LandingPage() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <LoadingSpinner message="Checking session..." />;
  }

  if (user && user.role === "patient") {
    return (
      <div className="container mt-5">
        <div className="text-center mb-5">
          <h2>Welcome, {user.name || "Patient"} 🦷</h2>
          <p className="lead">Select an action below or browse our services:</p>
          <div className="mb-4">
            <Link to="/patient/appointment" className="btn btn-primary m-2">
              Book Appointment
            </Link>
            <Link to="/patient/appointments" className="btn btn-outline-secondary m-2">
              View Appointments
            </Link>
            <Link to="/patient/profile" className="btn btn-outline-info m-2">
              Profile
            </Link>
          </div>
        </div>
        
        {/* Services and Promos for Patient */}
        <ServicesAndPromos />
      </div>
    );
  }

  return (
    <div className="landing-page">
      {/* Header */}
<header className="site-header shadow-sm">
  <div className="container d-flex justify-content-between align-items-center py-3">
    {/* Logo + Text */}
    <div className="d-flex align-items-center">
      <img
        src={kreativeLogo}
        alt="Kreative Dental Logo"
        className="site-logo me-2"
      />
      <span className="logo-text">Kreative Dental Clinic</span>
    </div>

    <nav>
      <ul className="nav-list d-flex gap-3 mb-0">
        <li><a href="#home" className="nav-link">Home</a></li>
        <li><a href="#services" className="nav-link">Services</a></li>
        <li><a href="#about" className="nav-link">About</a></li>
        <li><a href="#contact" className="nav-link">Contact</a></li>
      </ul>
    </nav>
  </div>
</header>



      {/* Hero Section */}
      <section id="home" className="hero-section d-flex align-items-center text-white">
        <div className="container text-center">
          <h1 className="hero-title">
            Your Smile, Our Passion <br /> Kreative Dental & Orthodontics
          </h1>
          <p className="hero-subtitle">
            Trusted dental care for families and individuals.
          </p>
          <div className="hero-buttons mt-4">
            <Link to="/login" className="btn btn-light btn-lg mx-2 shadow">
              Login
            </Link>
            <Link to="/register" className="btn btn-outline-light btn-lg mx-2">
              Register
            </Link>
          </div>
        </div>
      </section>

      {/* Services and Promos Section */}
      <section id="services">
        <ServicesAndPromos />
      </section>

      {/* Features Section */}
      <section className="features-section py-5">
        <div className="container">
          <div className="row text-center">
            <div className="col-md-4 mb-4">
              <div className="feature-box p-4 h-100 shadow-sm rounded">
                <i className="bi bi-shield-check fs-1 text-primary"></i>
                <h5 className="mt-3">Safe & Secure</h5>
                <p>We ensure a sterile and hygienic environment in all treatments.</p>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="feature-box p-4 h-100 shadow-sm rounded">
                <i className="bi bi-calendar2-check fs-1 text-success"></i>
                <h5 className="mt-3">Easy Appointment</h5>
                <p>Book your slot online and avoid waiting queues.</p>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="feature-box p-4 h-100 shadow-sm rounded">
                <i className="bi bi-person-heart fs-1 text-danger"></i>
                <h5 className="mt-3">Caring Dentists</h5>
                <p>Experienced, friendly professionals to guide your oral care.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section py-5 bg-primary">
        <div className="container text-center">
          <h2 className="mb-4">About Us</h2>
          <p className="lead">
            Kreative Dental Clinic is committed to providing high-quality dental care
            in a friendly, safe, and comfortable environment. Our team of professionals
            ensures that every patient receives the best oral health solutions tailored to
            their needs.
          </p>
        </div>
      </section>
{/* Contact Section */}
<section id="contact" className="contact-section py-5 bg-light">
  <div className="container text-center">
    <h2 className="mb-4 fw-bold">Contact Us</h2>
    <p className="lead text-muted mb-5">
      We’d love to hear from you! Reach out through any of the options below.
    </p>

    {/* Contact Info */}
    <div className="row justify-content-center mb-4">
      <div className="col-md-4 mb-3">
        <div className="p-4 bg-white shadow-sm rounded h-100">
          <i className="bi bi-geo-alt-fill fs-2 text-danger"></i>
          <h5 className="mt-2">Location</h5>
          <p className="mb-0">Cabuyao | Calamba</p>
        </div>
      </div>
      <div className="col-md-4 mb-3">
        <div className="p-4 bg-white shadow-sm rounded h-100">
          <i className="bi bi-telephone-fill fs-2 text-success"></i>
          <h5 className="mt-2">Call Us</h5>
          <p className="mb-0">0927 759 2845</p>
        </div>
      </div>
      <div className="col-md-4 mb-3">
        <div className="p-4 bg-white shadow-sm rounded h-100">
          <i className="bi bi-envelope-fill fs-2 text-primary"></i>
          <h5 className="mt-2">Email</h5>
          <p className="mb-0">kreativedent@gmail.com</p>
        </div>
      </div>
    </div>

    {/* Social / Action Buttons */}
    <div className="d-flex justify-content-center gap-3 flex-wrap mt-4">
      <a href="mailto:kreativedent@gmail.com" className="btn btn-primary">
        <i className="bi bi-envelope-fill me-2"></i> Email
      </a>
      <a
        href="https://www.facebook.com/kreativedent"
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-outline-primary"
      >
        <i className="bi bi-facebook me-2"></i> Facebook
      </a>
      <a
        href="https://www.instagram.com/kreativedental/"
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-outline-danger"
      >
        <i className="bi bi-instagram me-2"></i> Instagram
      </a>
      <a
        href="https://www.tiktok.com/@kreativedental"
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-dark"
      >
        <i className="bi bi-tiktok me-2"></i> TikTok
      </a>
      <a
        href="https://www.google.com/maps/dir/14.2721246,121.1544842/14.2540966,121.1284223/@14.2667727,121.1189606,14z/data=!3m1!4b1!4m4!4m3!1m1!4e1!1m0?entry=ttu&g_ep=EgoyMDI1MDkyNC4wIKXMDSoASAFQAw%3D%3D"
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-success"
      >
        <i className="bi bi-geo-alt-fill me-2"></i> Get Directions
      </a>
    </div>
  </div>
</section>


      {/* Footer */}
      <footer className="text-center py-3 bg-primary text-white">
        <p className="mb-0">&copy; {new Date().getFullYear()} Kreative Dental Clinic. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

export default LandingPage;
