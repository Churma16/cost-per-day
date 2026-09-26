import React, { useEffect, useRef, useState } from 'react';

const ICON_VIEW_BOX = '0 0 26 26';
const ICON_CENTER = 13;
const OUTER_RADIUS = 9.5;
const PRIMARY_STROKE = 2.2;
const EMPHASIS_STROKE = 2.4;
const DETAIL_STROKE = 1.6;

const sharedSvgProps = {
  'aria-hidden': true,
  focusable: 'false',
  viewBox: ICON_VIEW_BOX,
  width: 26,
  height: 26,
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
};

function HomeOwnershipRing({ active }) {
  return (
    <>
      <circle
        className="navigation-icon__neutral-ring"
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        r={OUTER_RADIUS}
        stroke="currentColor"
        strokeWidth={PRIMARY_STROKE}
      />
      <path
        className={`home-arc navigation-icon__accent ${active ? 'is-active' : ''}`.trim()}
        d="M13 3.5 A9.5 9.5 0 1 1 4.2 18"
        stroke="currentColor"
        strokeWidth={PRIMARY_STROKE}
        strokeLinecap="round"
      />
      <circle
        className={`home-dot ${active ? 'navigation-icon__accent' : 'navigation-icon__neutral-ring'}`}
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        r="2.2"
        fill="currentColor"
      />
    </>
  );
}

function PlanningProgressRing({ active }) {
  const targetClass = active
    ? 'navigation-icon__accent'
    : 'navigation-icon__neutral-detail';

  return (
    <>
      <circle
        className={`planned-ring ${active ? 'navigation-icon__accent-lighter' : 'navigation-icon__neutral-ring'}`}
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        r={OUTER_RADIUS}
        stroke="currentColor"
        strokeWidth={PRIMARY_STROKE}
        strokeDasharray="2.5 3"
      />
      <circle className={`planned-target-dot ${targetClass} ${active ? 'is-active' : ''}`.trim()} cx="13" cy="3.5" r="2" fill="currentColor" />
      <circle className={`planned-center-dot ${active ? 'navigation-icon__accent' : 'navigation-icon__neutral-ring'}`} cx="13" cy="13" r="1.6" fill="currentColor" />
    </>
  );
}

function AddOwnershipRing({ active }) {
  return (
    <>
      <circle
        className={`add-ring ${active ? 'navigation-icon__accent-lighter' : 'navigation-icon__neutral-ring'}`}
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        r={OUTER_RADIUS}
        stroke="currentColor"
        strokeWidth={PRIMARY_STROKE}
      />
      <path
        className={`add-plus ${active ? 'navigation-icon__accent' : 'navigation-icon__neutral-detail'}`}
        d="M13 8.5V17.5M8.5 13H17.5"
        stroke="currentColor"
        strokeWidth={active ? EMPHASIS_STROKE : PRIMARY_STROKE}
        strokeLinecap="round"
      />
    </>
  );
}

function DurabilityRings({ active }) {
  return (
    <>
      <circle
        className={`durability-outer ${active ? 'navigation-icon__accent-lighter' : 'navigation-icon__neutral-ring'}`}
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        r={OUTER_RADIUS}
        stroke="currentColor"
        strokeWidth={DETAIL_STROKE}
      />
      <circle
        className={`durability-mid ${active ? 'navigation-icon__accent-subtle' : 'navigation-icon__neutral-ring'}`}
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        r="6.2"
        stroke="currentColor"
        strokeWidth={DETAIL_STROKE}
      />
      <circle
        className={`durability-inner ${active ? 'navigation-icon__accent' : 'navigation-icon__neutral-detail'}`}
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        r="2.8"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : DETAIL_STROKE}
      />
    </>
  );
}

function SettingsOwnershipGear({ active }) {
  const previousActiveRef = useRef(active);
  const [rotation, setRotation] = useState(0);
  const stateClass = active
    ? 'navigation-icon__accent'
    : 'navigation-icon__neutral-detail';
  const strokeWidth = active ? EMPHASIS_STROKE : PRIMARY_STROKE;

  useEffect(() => {
    const stateChanged = previousActiveRef.current !== active;

    if (active || stateChanged) {
      setRotation((currentRotation) => currentRotation + 12);
    }

    previousActiveRef.current = active;
  }, [active]);

  return (
    <g
      className="settings-gear"
      data-rotation={rotation}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <circle
        className={`settings-circle ${stateClass}`}
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        r="3.4"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      <path
        className={`settings-spokes ${stateClass}`}
        d="M13 4V6.3M13 19.7V22M22 13H19.7M6.3 13H4M19.4 6.6L17.8 8.2M8.2 17.8L6.6 19.4M19.4 19.4L17.8 17.8M8.2 8.2L6.6 6.6"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </g>
  );
}

const iconComponents = {
  home: HomeOwnershipRing,
  planning: PlanningProgressRing,
  add: AddOwnershipRing,
  analytics: DurabilityRings,
  settings: SettingsOwnershipGear,
};

function NavigationIcon({ name, active = false, className = '' }) {
  const IconComponent = iconComponents[name];

  if (!IconComponent) {
    return null;
  }

  return (
    <svg
      {...sharedSvgProps}
      className={`navigation-icon ${className}`.trim()}
      data-navigation-icon={name}
      data-active={active ? 'true' : 'false'}
    >
      <IconComponent active={active} />
    </svg>
  );
}

export default NavigationIcon;
