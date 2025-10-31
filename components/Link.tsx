import React from 'react';
import Svg, { Line } from 'react-native-svg';

interface LinkProps {
  links: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
  }>;
}

const Link: React.FC<LinkProps> = ({ links }) => {
  return (
    <Svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
      {links.map((link, index) => (
        <Line
          key={index}
          x1={link.from.x}
          y1={link.from.y}
          x2={link.to.x}
          y2={link.to.y}
          stroke="black"
          strokeWidth="2"
        />
      ))}
    </Svg>
  );
};

export default Link;