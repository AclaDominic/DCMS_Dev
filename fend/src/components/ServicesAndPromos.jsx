import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";
import LoadingSpinner from "./LoadingSpinner";
import { useAuth } from "../hooks/useAuth";

// Custom styles for the promotions carousel
const carouselStyles = `
  .promo-card {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 15px;
    overflow: hidden;
  }
  
  .discount-circle {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #dc3545, #c82333);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);
  }
  
  .discount-text {
    color: white;
    font-size: 1.5rem;
    font-weight: bold;
    text-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  
  .promo-highlight {
    position: relative;
  }
  
  .carousel-control-prev,
  .carousel-control-next {
    width: 50px;
    height: 50px;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    top: 50%;
    transform: translateY(-50%);
    border: none;
  }
  
  .carousel-control-prev {
    left: -25px;
  }
  
  .carousel-control-next {
    right: -25px;
  }
  
  .carousel-indicators {
    bottom: -50px;
  }
  
  .carousel-indicators button {
    background-color: #6c757d;
    border-radius: 50%;
    width: 12px;
    height: 12px;
    margin: 0 5px;
  }
  
  .carousel-indicators button.active {
    background-color: #198754;
  }
  
  .promo-card .card-body {
    position: relative;
  }
  
  .promo-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #dc3545, #ffc107, #198754);
  }
`;

export default function ServicesAndPromos() {
  const [services, setServices] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchServicesAndPromos();
  }, []);



  const fetchServicesAndPromos = async () => {
    try {
      setLoading(true);
      
      // Fetch all active services with discounts from public endpoint
      const servicesRes = await api.get("/api/public/services");
      const allServices = Array.isArray(servicesRes.data)
        ? servicesRes.data
        : Array.isArray(servicesRes.data?.data)
          ? servicesRes.data.data
          : [];

      // Extract promos from services data (already included in the response on each service)
      const promosMap = {};
      allServices.forEach((service) => {
        const discounts = Array.isArray(service?.discounts) ? service.discounts : [];
        promosMap[service.id] = discounts;
      });
      
      setServices(allServices);
      setPromos(promosMap);
    } catch (err) {
      console.error("Failed to fetch services and promos:", err);
      setError("Failed to load services and promotions");
    } finally {
      setLoading(false);
    }
  };


  const handleBookNow = (service) => {
    if (!user) {
      // User is not logged in, redirect to login with message
      navigate('/login', { 
        state: { 
          message: 'Please log in to book an appointment',
          redirectTo: '/patient/appointment',
          preselectedService: service
        } 
      });
      return;
    }
    
    // User is logged in, proceed to booking
    navigate('/patient/appointment', { 
      state: { preselectedService: service } 
    });
  };

  const getCurrentPrice = (service) => {
    const servicePromos = promos[service.id] || [];
    const today = new Date().toISOString().split('T')[0];
    
    // Check for active promos
    const activePromo = servicePromos.find(promo => 
      promo.status === 'launched' &&
      promo.start_date <= today &&
      promo.end_date >= today
    );
    
    if (activePromo) {
      return {
        price: activePromo.discounted_price,
        originalPrice: service.price,
        isPromo: true,
        promoEndDate: activePromo.end_date
      };
    }
    
    return {
      price: service.price,
      originalPrice: null,
      isPromo: false,
      promoEndDate: null
    };
  };

  const isBookable = (service) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if service has special dates
    if (service.is_special && service.special_start_date && service.special_end_date) {
      return service.special_start_date <= today && service.special_end_date >= today;
    }
    
    // Check if service has upcoming promos that aren't bookable yet
    const servicePromos = promos[service.id] || [];
    const upcomingPromo = servicePromos.find(promo => 
      promo.status === 'planned' && promo.start_date > today
    );
    
    // If there's an upcoming promo, don't show book now button
    if (upcomingPromo) {
      return false;
    }
    
    return true;
  };

  const formatPrice = (price, isPerTeeth = false) => {
    const formatted = `₱${Number(price).toFixed(2)}`;
    return isPerTeeth ? `${formatted} per tooth` : formatted;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get all active promos for carousel
  const getAllActivePromos = () => {
    const today = new Date().toISOString().split('T')[0];
    const activePromos = [];
    
    services.forEach(service => {
      const servicePromos = promos[service.id] || [];
      const activePromo = servicePromos.find(promo => 
        promo.status === 'launched' &&
        promo.start_date <= today &&
        promo.end_date >= today
      );
      
      if (activePromo) {
        activePromos.push({
          ...activePromo,
          service: service
        });
      }
    });
    
    return activePromos.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  };

  // Calculate discount percentage
  const calculateDiscountPercentage = (originalPrice, discountedPrice) => {
    if (!originalPrice || !discountedPrice) return 0;
    const discount = ((originalPrice - discountedPrice) / originalPrice) * 100;
    return Math.round(discount);
  };

  // Skeleton loading component
  const SkeletonCard = () => (
    <div className="col-lg-4 col-md-6">
      <div className="card h-100 shadow-sm border-0 service-card">
        <div className="card-body d-flex flex-column">
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-start">
              <div className="placeholder-glow">
                <span className="placeholder col-8 placeholder-lg"></span>
              </div>
              <div className="placeholder-glow">
                <span className="placeholder col-3 placeholder-sm"></span>
              </div>
            </div>
            <div className="placeholder-glow mt-2">
              <span className="placeholder col-4 placeholder-sm"></span>
            </div>
          </div>
          
          <div className="placeholder-glow mb-3">
            <span className="placeholder col-12"></span>
            <span className="placeholder col-8"></span>
          </div>
          
          <div className="placeholder-glow mb-3">
            <span className="placeholder col-6 placeholder-lg"></span>
            <div className="placeholder-glow mt-1">
              <span className="placeholder col-4 placeholder-sm"></span>
            </div>
          </div>
          
          <div className="mt-auto">
            <div className="placeholder-glow">
              <span className="placeholder col-12 placeholder-lg"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );


  if (loading) {
    return (
      <section className="services-promos-section py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="display-5 fw-bold text-primary mb-3">
              Our Services & Promotions
            </h2>
            <p className="lead text-muted">
              Professional dental care with special offers and packages
            </p>
          </div>

          <div className="row g-4">
            {Array.from({ length: 6 }, (_, index) => (
              <SkeletonCard key={`skeleton-${index}`} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning text-center">
        <i className="bi bi-exclamation-triangle me-2"></i>
        {error}
      </div>
    );
  }

  return (
    <>
      <style>{carouselStyles}</style>
      <section className="services-promos-section py-5 bg-light">
        <div className="container">
        <div className="text-center mb-5">
          <h2 className="display-5 fw-bold text-primary mb-3">
            Our Services & Promotions
          </h2>
          <p className="lead text-muted">
            Professional dental care with special offers and packages
          </p>
        </div>

        {/* Promotions Carousel */}
        {getAllActivePromos().length > 0 ? (
          <div className="mb-5">
            <div className="text-center mb-4">
              <h3 className="h4 fw-bold text-success mb-2">
                <i className="bi bi-percent me-2"></i>
                Current Promotions
              </h3>
              <p className="text-muted">Limited time offers - Book now!</p>
            </div>
            
            <div id="promotionsCarousel" className="carousel slide" data-bs-ride="carousel">
              <div className="carousel-inner">
                {getAllActivePromos().map((promo, index) => {
                  const discountPercentage = calculateDiscountPercentage(promo.service.price, promo.discounted_price);
                  return (
                    <div 
                      key={promo.id} 
                      className={`carousel-item ${index === 0 ? 'active' : ''}`}
                    >
                      <div className="container">
                        <div className="row justify-content-center">
                          <div className="col-lg-10">
                            <div className="card border-0 shadow-lg promo-card">
                              <div className="card-body p-4">
                                <div className="row align-items-center">
                                  <div className="col-lg-8">
                                    <div className="d-flex align-items-center mb-3">
                                      <span className="badge bg-danger fs-6 me-3">
                                        <i className="bi bi-percent me-1"></i>
                                        {discountPercentage}% OFF
                                      </span>
                                      <span className="badge bg-warning text-dark">
                                        <i className="bi bi-clock me-1"></i>
                                        Limited Time
                                      </span>
                                    </div>
                                    
                                    <h4 className="card-title text-primary fw-bold mb-3">
                                      {promo.service.name}
                                    </h4>
                                    
                                    <p className="card-text text-muted mb-3">
                                      {promo.service.description || "Professional dental service with special pricing"}
                                    </p>
                                    
                                    <div className="d-flex align-items-center gap-4 mb-3">
                                      <div>
                                        <span className="h3 text-success fw-bold mb-0">
                                          {formatPrice(promo.discounted_price, promo.service.per_teeth_service)}
                                        </span>
                                        <span className="text-decoration-line-through text-muted ms-2">
                                          {formatPrice(promo.service.price, promo.service.per_teeth_service)}
                                        </span>
                                      </div>
                                      <div className="text-muted">
                                        <small>
                                          <i className="bi bi-calendar-check me-1"></i>
                                          Valid until: {formatDate(promo.end_date)}
                                        </small>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="col-lg-4 text-center">
                                    <div className="promo-highlight">
                                      <div className="discount-circle mx-auto mb-3">
                                        <span className="discount-text">{discountPercentage}%</span>
                                      </div>
                                      <button 
                                        className="btn btn-success btn-lg w-100"
                                        onClick={() => handleBookNow(promo.service)}
                                      >
                                        <i className="bi bi-calendar-plus me-2"></i>
                                        Book This Offer
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Carousel Controls */}
              {getAllActivePromos().length > 1 && (
                <>
                  <button 
                    className="carousel-control-prev" 
                    type="button" 
                    data-bs-target="#promotionsCarousel" 
                    data-bs-slide="prev"
                  >
                    <span className="carousel-control-prev-icon" aria-hidden="true"></span>
                    <span className="visually-hidden">Previous</span>
                  </button>
                  <button 
                    className="carousel-control-next" 
                    type="button" 
                    data-bs-target="#promotionsCarousel" 
                    data-bs-slide="next"
                  >
                    <span className="carousel-control-next-icon" aria-hidden="true"></span>
                    <span className="visually-hidden">Next</span>
                  </button>
                  
                  {/* Carousel Indicators */}
                  <div className="carousel-indicators">
                    {getAllActivePromos().map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        data-bs-target="#promotionsCarousel"
                        data-bs-slide-to={index}
                        className={index === 0 ? 'active' : ''}
                        aria-current={index === 0 ? 'true' : 'false'}
                        aria-label={`Slide ${index + 1}`}
                      ></button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-5">
            <div className="text-center">
              <div className="card border-0 bg-light">
                <div className="card-body py-4">
                  <i className="bi bi-calendar-x text-muted" style={{fontSize: '3rem'}}></i>
                  <h5 className="text-muted mt-3 mb-2">No Active Promotions</h5>
                  <p className="text-muted mb-0">
                    Check back soon for special offers and discounts on our services!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="row g-4">
          {Array.isArray(services) && services.map((service) => {
            const priceInfo = getCurrentPrice(service);
            const bookable = isBookable(service);
            
            return (
              <div key={service.id} className="col-lg-4 col-md-6">
                <div className="card h-100 shadow-sm border-0 service-card">
                  <div className="card-body d-flex flex-column">
                    {/* Service Header */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-start">
                        <h5 className="card-title fw-bold text-primary mb-2">
                          {service.name}
                        </h5>
                        {service.is_special ? (
                          <span className="badge bg-warning text-dark">
                            <i className="bi bi-star-fill me-1"></i>
                            Special
                          </span>
                        ) : (
                          <span></span>
                        )}
                      </div>
                      
                      {service.category && (
                        <span className="badge bg-secondary mb-2">
                          {typeof service.category === 'string' ? service.category : (service.category?.name || "")}
                        </span>
                      )}
                    </div>

                    {/* Service Description */}
                    <p className="card-text text-muted flex-grow-1">
                      {service.description || "Professional dental service"}
                    </p>

                    {/* Pricing */}
                    <div className="mb-3">
                      {priceInfo.isPromo ? (
                        <div>
                          <div className="d-flex align-items-center gap-2">
                            <span className="h4 text-success fw-bold mb-0">
                              {formatPrice(priceInfo.price, service.per_teeth_service)}
                            </span>
                            <span className="text-decoration-line-through text-muted">
                              {formatPrice(priceInfo.originalPrice, service.per_teeth_service)}
                            </span>
                            <span className="badge bg-danger">
                              <i className="bi bi-percent me-1"></i>
                              Sale
                            </span>
                          </div>
                          <small className="text-muted">
                            Promo ends: {formatDate(priceInfo.promoEndDate)}
                          </small>
                        </div>
                      ) : (
                        <div>
                          <div className="h4 text-primary fw-bold mb-0">
                            {formatPrice(priceInfo.price, service.per_teeth_service)}
                          </div>
                          {service.per_teeth_service && (
                            <small className="text-info">
                              <i className="bi bi-info-circle me-1"></i>
                              Total cost depends on number of teeth treated
                            </small>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="mt-auto">
                      {bookable ? (
                        <button 
                          className="btn btn-primary w-100"
                          onClick={() => handleBookNow(service)}
                        >
                          <i className="bi bi-calendar-plus me-2"></i>
                          Book Now
                        </button>
                      ) : (
                        <div className="text-center">
                          <button 
                            className="btn btn-outline-secondary w-100" 
                            disabled
                          >
                            <i className="bi bi-clock me-2"></i>
                            Coming Soon
                          </button>
                          {service.is_special && service.special_start_date && service.special_end_date ? (
                            <small className="text-muted d-block mt-2">
                              Available: {formatDate(service.special_start_date)} - {formatDate(service.special_end_date)}
                            </small>
                          ) : (
                            <span></span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
        </div>

        {/* Call to Action */}
        <div className="text-center mt-5">
          <div className="row justify-content-center">
            <div className="col-md-8">
              <div className="card bg-primary text-white">
                <div className="card-body py-4">
                  <h4 className="card-title mb-3">
                    <i className="bi bi-heart-pulse me-2"></i>
                    Ready to Book Your Appointment?
                  </h4>
                  <p className="card-text mb-4">
                    Choose from our professional services and take advantage of our current promotions. 
                    Book online for a convenient and seamless experience.
                  </p>
                  <button 
                    className="btn btn-light btn-lg"
                    onClick={() => handleBookNow(null)}
                  >
                    <i className="bi bi-calendar-check me-2"></i>
                    Book Appointment Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
