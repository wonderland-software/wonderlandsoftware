import React, { useEffect, useRef, useState, useMemo } from "react";
import "./App.css";
import rabbitSprite from "./assets/rabbit_sprite.png";

function App() {
  const [frame, setFrame] = useState(0);
  const requestRef = useRef();
  const previousTimeRef = useRef();

  const animate = (time) => {
    if (previousTimeRef.current != undefined) {
      const deltaTime = time - previousTimeRef.current;

      // Update frame every 150ms
      if (deltaTime > 150) {
        setFrame((prevFrame) => (prevFrame + 1) % 24);
        previousTimeRef.current = time;
      }
    } else {
      previousTimeRef.current = time;
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  const spriteStyle = useMemo(
    () => ({
      backgroundImage: `url(${rabbitSprite})`,
      backgroundPosition: `${-(frame % 4) * 64}px ${
        -Math.floor(frame / 4) * 64
      }px`,
    }),
    [frame]
  );

  return (
    <div className="App">
      <header className="App-header">
        <h1>wonderland.software</h1>
        <div className="rabbit-container">
          <div className="rabbit-sprite" style={spriteStyle} />
        </div>
      </header>
    </div>
  );
}

export default App;
