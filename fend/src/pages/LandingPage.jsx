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
      <div className="container mt-5 px-3 px-md-4">
        <div className="text-center mb-5">
          <h2 className="mb-3">Welcome, {user.name || "Patient"} 🦷</h2>
          <p className="lead">Select an action below or browse our services:</p>
          <div className="mb-4 d-flex flex-column flex-sm-row justify-content-center align-items-center gap-2 flex-wrap">
            <Link to="/patient/appointment" className="btn btn-primary">
              Book Appointment
            </Link>
            <Link to="/patient/appointments" className="btn btn-outline-secondary">
              View Appointments
            </Link>
            <Link to="/patient/profile" className="btn btn-outline-info">
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
  <div className="container d-flex justify-content-between align-items-center py-2 py-md-3">
    {/* Logo + Text */}
    <div className="d-flex align-items-center">
      <img
        src={kreativeLogo}
        alt="Kreative Dental Logo"
        className="site-logo me-2"
      />
      <span className="logo-text">Kreative Dental Clinic</span>
    </div>

    {/* Mobile Menu Toggle */}
    <button 
      className="navbar-toggler d-md-none border-0 p-2"
      type="button"
      onClick={() => {
        const nav = document.getElementById('mobile-nav');
        if (nav) nav.classList.toggle('show');
      }}
      aria-label="Toggle navigation"
      style={{ background: 'transparent' }}
    >
      <i className="bi bi-list fs-4" style={{ color: 'var(--brand-dark)' }}></i>
    </button>

    {/* Desktop Navigation */}
    <nav className="d-none d-md-block">
      <ul className="nav-list d-flex gap-2 gap-lg-3 mb-0">
        <li><a href="#home" className="nav-link">Home</a></li>
        <li><a href="#services" className="nav-link">Services</a></li>
        <li><a href="#about" className="nav-link">About</a></li>
        <li><a href="#contact" className="nav-link">Contact</a></li>
      </ul>
    </nav>
  </div>

  {/* Mobile Navigation */}
  <nav id="mobile-nav" className="d-md-none mobile-nav">
    <ul className="nav-list flex-column mb-0 p-3">
      <li><a href="#home" className="nav-link" onClick={() => document.getElementById('mobile-nav')?.classList.remove('show')}>Home</a></li>
      <li><a href="#services" className="nav-link" onClick={() => document.getElementById('mobile-nav')?.classList.remove('show')}>Services</a></li>
      <li><a href="#about" className="nav-link" onClick={() => document.getElementById('mobile-nav')?.classList.remove('show')}>About</a></li>
      <li><a href="#contact" className="nav-link" onClick={() => document.getElementById('mobile-nav')?.classList.remove('show')}>Contact</a></li>
    </ul>
  </nav>
</header>



      {/* Hero Section */}
      <section id="home" className="hero-section d-flex align-items-center text-white">
        <div className="container text-center px-3 px-md-4">
          <h1 className="hero-title mb-3 mb-md-4">
            Your Smile, Our Passion <br className="d-none d-sm-inline" /> 
            <span className="d-inline d-sm-none"><br /></span>
            <span className="d-block d-sm-inline">Kreative Dental & Orthodontics</span>
          </h1>
          <p className="hero-subtitle mb-4 mb-md-5">
            Trusted dental care for families and individuals.
          </p>
          <div className="hero-buttons mt-4 d-flex flex-column flex-sm-row justify-content-center align-items-center gap-2 gap-md-3">
            <Link to="/login" className="btn btn-light btn-lg shadow w-100 w-sm-auto px-4">
              Login
            </Link>
            <Link to="/register" className="btn btn-outline-light btn-lg w-100 w-sm-auto px-4">
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
      <section className="features-section py-4 py-md-5">
        <div className="container px-3 px-md-4">
          <div className="row text-center g-3 g-md-4">
            <div className="col-12 col-sm-6 col-md-4 mb-2 mb-md-0">
              <div className="feature-box p-3 p-md-4 h-100 shadow-sm rounded">
                <i className="bi bi-shield-check fs-1 text-primary"></i>
                <h5 className="mt-3">Safe & Secure</h5>
                <p className="mb-0">We ensure a sterile and hygienic environment in all treatments.</p>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-md-4 mb-2 mb-md-0">
              <div className="feature-box p-3 p-md-4 h-100 shadow-sm rounded">
                <i className="bi bi-calendar2-check fs-1 text-success"></i>
                <h5 className="mt-3">Easy Appointment</h5>
                <p className="mb-0">Book your slot online and avoid waiting queues.</p>
              </div>
            </div>
            <div className="col-12 col-sm-6 col-md-4 mb-2 mb-md-0">
              <div className="feature-box p-3 p-md-4 h-100 shadow-sm rounded">
                <i className="bi bi-person-heart fs-1 text-danger"></i>
                <h5 className="mt-3">Caring Dentists</h5>
                <p className="mb-0">Experienced, friendly professionals to guide your oral care.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section py-4 py-md-5 bg-primary">
        <div className="container text-center px-3 px-md-4">
          <h2 className="mb-3 mb-md-4">About Us</h2>
          <p className="lead mb-0">
            Kreative Dental Clinic is committed to providing high-quality dental care
            in a friendly, safe, and comfortable environment. Our team of professionals
            ensures that every patient receives the best oral health solutions tailored to
            their needs.
          </p>
        </div>
      </section>
{/* Contact Section */}
<section id="contact" className="contact-section py-4 py-md-5 bg-light">
  <div className="container text-center px-3 px-md-4">
    <h2 className="mb-3 mb-md-4 fw-bold">Contact Us</h2>
    <p className="lead text-muted mb-4 mb-md-5">
      We'd love to hear from you! Reach out through any of the options below.
    </p>

    {/* Contact Info */}
    <div className="row justify-content-center mb-4 g-3">
      <div className="col-12 col-sm-6 col-md-4">
        <div className="p-3 p-md-4 bg-white shadow-sm rounded h-100">
          <i className="bi bi-geo-alt-fill fs-2 text-danger"></i>
          <h5 className="mt-2">Location</h5>
          <p className="mb-0">Cabuyao | Calamba</p>
        </div>
      </div>
      <div className="col-12 col-sm-6 col-md-4">
        <div className="p-3 p-md-4 bg-white shadow-sm rounded h-100">
          <i className="bi bi-telephone-fill fs-2 text-success"></i>
          <h5 className="mt-2">Call Us</h5>
          <p className="mb-0">0927 759 2845</p>
        </div>
      </div>
      <div className="col-12 col-sm-6 col-md-4">
        <div className="p-3 p-md-4 bg-white shadow-sm rounded h-100">
          <i className="bi bi-envelope-fill fs-2 text-primary"></i>
          <h5 className="mt-2">Email</h5>
          <p className="mb-0">kreativedent@gmail.com</p>
        </div>
      </div>
    </div>

    {/* Map Section */}
    <div className="row justify-content-center mt-4 mb-4">
      <div className="col-12 col-lg-10">
        <div className="map-container shadow-sm rounded overflow-hidden">
          <iframe
            src="https://www.google.com/maps?q=14.2540966,121.1284223&hl=en&z=14&output=embed"
            width="100%"
            height="450"
            style={{ border: 0 }}
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Kreative Dental Clinic Location - Cabuyao, Calamba"
          ></iframe>
        </div>
      </div>
    </div>

    {/* Social / Action Buttons */}
    <div className="d-flex justify-content-center gap-2 gap-md-3 flex-wrap mt-4">
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
        <i className="bi bi-geo-alt-fill me-2"></i> <span className="d-none d-sm-inline">Get </span>Directions
      </a>
    </div>
  </div>
</section>


      {/* Footer */}
      <footer className="text-center py-3 py-md-4 bg-primary text-white">
        <div className="container px-3 px-md-4">
          <p className="mb-0 small">&copy; {new Date().getFullYear()} Kreative Dental Clinic. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
