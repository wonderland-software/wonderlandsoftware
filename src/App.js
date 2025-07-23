import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import "./App.css";
import rabbitSprite from "./assets/rabbit_sprite.png";
import gearRoomLogo from "./assets/GearRoomLogo.PNG";
import mfjLogo from "./assets/mfj_logo_blk.png";
import tapinLogo from "./assets/tapinlogo.png";
import socalLogo from "./assets/socallogo.jpg";

function App() {
  const [frame, setFrame] = useState(0);
  const requestRef = useRef();
  const previousTimeRef = useRef();

  const totalFrames = 24; // Adjust this if your sprite has a different number of frames

  const animate = useCallback((time) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;

      // Update frame every 150ms
      if (deltaTime > 150) {
        setFrame((prevFrame) => (prevFrame + 1) % totalFrames);
        previousTimeRef.current = time;
      }
    } else {
      previousTimeRef.current = time;
    }
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  const spriteStyle = useMemo(
    () => ({
      backgroundImage: `url(${rabbitSprite})`,
      backgroundPosition: `${-(frame % 4) * 64}px ${
        -Math.floor(frame / 4) * 64
      }px`,
    }),
    [frame]
  );

  const services = [
    {
      title: "iOS Development",
      description: "Native iOS apps with Swift & SwiftUI",
      icon: "📱",
    },
    {
      title: "React + Vite + 3JS",
      description: "Modern web experiences with 3D graphics",
      icon: "🌐",
    },
    {
      title: "Shopify",
      description: "E-commerce solutions & custom integrations",
      icon: "🛒",
    },
  ];

  const projects = [
    {
      title: "The Gear Room",
      description: "E-commerce platform for outdoor adventure gear",
      url: "https://thegearroom.com/",
      logo: gearRoomLogo,
      category: "E-commerce",
    },
    {
      title: "Millennium Film Journal",
      description: "Digital platform for film criticism and theory",
      url: "https://millenniumfilmjournal.com/",
      logo: mfjLogo,
      category: "Media",
    },
    {
      title: "Tap In",
      description: "A social app that lets users plan things together",
      url: "https://tapin.lol/",
      logo: tapinLogo,
      category: "Social",
    },
    {
      title: "socal - the social calendar",
      description: "A social app that allows users to plan events",
      url: "https://socal.day/",
      logo: socalLogo,
      category: "Social",
    },
    {
      title: "Virtual X World",
      description: "Creates virtual worlds for X spaces",
      url: "https://virtual-x-world.vercel.app/login",
      icon: "🌐",
      category: "Virtual Worlds",
    },
  ];

  return (
    <div className="App">
      <header className="App-header">
        <h1>Wonderland Software</h1>
        <div className="rabbit-container">
          <div className="rabbit-sprite" style={spriteStyle} />
        </div>
        <a
          href="mailto:tag@wonderland.software?subject=Project%20Quote%20Request&body=Hi%20Tag,%0A%0AI'm%20interested%20in%20working%20with%20Wonderland%20Software%20on%20a%20new%20project.%0A%0AProject%20Details:%0A-%20Platform:%20(iOS,%20Web,%20Shopify,%20etc.)%0A-%20Timeline:%20%0A-%20Budget%20Range:%20%0A-%20Brief%20Description:%20%0A%0ACould%20we%20schedule%20a%20time%20to%20discuss%20this%20further?%0A%0AThanks!%0A%0ABest%20regards"
          className="email-button"
          onClick={(e) => {
            // Fallback for browsers that block mailto
            setTimeout(() => {
              if (document.hasFocus()) {
                navigator.clipboard?.writeText("tag@wonderland.software");
                alert("Email copied to clipboard: tag@wonderland.software");
              }
            }, 500);
          }}
        >
          <span className="email-icon">✉️</span>
          Request a Quote
        </a>

        <div className="services-grid">
          {services.map((service, index) => (
            <div key={index} className="service-card">
              <div className="service-icon">{service.icon}</div>
              <h3 className="service-title">{service.title}</h3>
              <p className="service-description">{service.description}</p>
            </div>
          ))}
        </div>

        <section className="projects-section">
          <h2 className="projects-heading">Featured Projects</h2>
          <div className="projects-grid">
            {projects.map((project, index) => (
              <a
                key={index}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="project-card"
              >
                <div className="project-header">
                  <div className="project-icon">
                    {project.logo ? (
                      <img
                        src={project.logo}
                        alt={`${project.title} logo`}
                        className="project-logo"
                      />
                    ) : (
                      project.icon
                    )}
                  </div>
                  <span className="project-category">{project.category}</span>
                </div>
                <h3 className="project-title">{project.title}</h3>
                <p className="project-description">{project.description}</p>
                <div className="project-link">Visit Site →</div>
              </a>
            ))}
          </div>
        </section>
      </header>
    </div>
  );
}

export default App;
