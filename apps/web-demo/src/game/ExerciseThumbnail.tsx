import React, { useState } from 'react';
import { ExerciseItem } from '../config/catalogConfig';

interface ExerciseThumbnailProps {
  exercise: ExerciseItem;
  sizeClass?: string;
  size?: number;
  showPhotoToggle?: boolean;
}

/**
 * Professional Sports-Science Anatomical Muscle Highlight & Biomechanical Form Diagram
 * + Open-Source `free-exercise-db` Real Demonstration Photo Support (Zero Pixel Art!)
 */
export const ExerciseThumbnail: React.FC<ExerciseThumbnailProps> = ({
  exercise,
  sizeClass = 'w-11 h-11',
  size,
  showPhotoToggle = false,
}) => {
  const [useRealPhoto, setUseRealPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const photoUrl = exercise.freeExerciseDbId
    ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${exercise.freeExerciseDbId}/0.jpg`
    : null;

  const boxStyle = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  if (useRealPhoto && photoUrl && !photoError) {
    return (
      <div
        style={boxStyle}
        onClick={(e) => {
          if (showPhotoToggle) {
            e.stopPropagation();
            setUseRealPhoto(false);
          }
        }}
        className={`${
          size ? '' : sizeClass
        } rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-white shrink-0 shadow-sm relative`}
        title={`${exercise.nameZh} (${exercise.nameEn})`}
      >
        <img
          src={photoUrl}
          alt={exercise.nameZh}
          onError={() => setPhotoError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Professional Anatomical Muscle & Biomechanical Vector Illustration (SVG)
  const renderAnatomicalSvg = () => {
    const icon = exercise.iconType;
    const grp = exercise.muscleGroup;

    // Primary muscle highlight color (Medical/Sports Science Crimson)
    const primaryHot = '#ef4444';
    const secondaryHot = '#f97316';
    const bodyBase = '#cbd5e1';
    const bodyStroke = '#475569';
    const equipColor = '#1e293b';

    switch (icon) {
      case 'squat':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full">
            <rect width="64" height="64" rx="12" fill="#f1f5f9" />
            {/* Subtle biomechanical grid */}
            <line x1="0" y1="54" x2="64" y2="54" stroke="#e2e8f0" strokeWidth="1.5" />
            <line x1="32" y1="6" x2="32" y2="58" stroke="#e2e8f0" strokeDasharray="2 2" strokeWidth="1" />
            {/* Athletic figure in deep squat biomechanics */}
            <circle cx="34" cy="14" r="5" fill={bodyBase} stroke={bodyStroke} strokeWidth="1.6" />
            {/* Torso & Core (Secondary) */}
            <path
              d="M32 20 L24 34 L31 37 L38 23 Z"
              fill={secondaryHot}
              stroke={bodyStroke}
              strokeWidth="1.4"
            />
            {/* Highlighted Glutes & Quadriceps (Primary Active Muscle!) */}
            <path
              d="M23 34 C19 36 19 41 24 41 L38 40 C40 38 38 35 34 35 Z"
              fill={primaryHot}
              stroke="#991b1b"
              strokeWidth="1.5"
            />
            {/* Lower leg / Tibia */}
            <path
              d="M37 39 L33 52 L38 52 L41 40 Z"
              fill={bodyBase}
              stroke={bodyStroke}
              strokeWidth="1.4"
            />
            {/* Olympic Barbell across upper traps */}
            <line x1="12" y1="20" x2="52" y2="20" stroke={equipColor} strokeWidth="2.8" strokeLinecap="round" />
            <rect x="14" y="13" width="4" height="14" rx="1.5" fill="#dc2626" />
            <rect x="46" y="13" width="4" height="14" rx="1.5" fill="#dc2626" />
            {/* Anatomical Muscle Tag Dot */}
            <circle cx="26" cy="37" r="2.2" fill="#ffffff" />
          </svg>
        );

      case 'bench':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full">
            <rect width="64" height="64" rx="12" fill="#f1f5f9" />
            {/* Flat Bench */}
            <rect x="10" y="39" width="38" height="4.5" rx="2" fill="#64748b" />
            <rect x="15" y="43" width="3.5" height="11" fill="#475569" />
            <rect x="40" y="43" width="3.5" height="11" fill="#475569" />
            {/* Supine Athlete */}
            <circle cx="16" cy="34" r="4.5" fill={bodyBase} stroke={bodyStroke} strokeWidth="1.5" />
            {/* Highlighted Pectoralis Major & Anterior Deltoid */}
            <path
              d="M22 33 C27 30 35 31 39 34 L39 39 L22 39 Z"
              fill={primaryHot}
              stroke="#991b1b"
              strokeWidth="1.5"
            />
            {/* Legs anchored */}
            <path
              d="M39 36 L49 36 L53 51 L49 52 L46 40 L39 39 Z"
              fill={bodyBase}
              stroke={bodyStroke}
              strokeWidth="1.4"
            />
            {/* Pressing Arm (Triceps secondary) */}
            <path
              d="M27 34 L27 19"
              stroke={secondaryHot}
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Barbell & Plates */}
            <line x1="15" y1="16" x2="41" y2="16" stroke={equipColor} strokeWidth="2.5" />
            <rect x="18" y="9" width="4" height="14" rx="1.5" fill="#2563eb" />
            <rect x="34" y="9" width="4" height="14" rx="1.5" fill="#2563eb" />
          </svg>
        );

      case 'deadlift':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full">
            <rect width="64" height="64" rx="12" fill="#f1f5f9" />
            <line x1="6" y1="53" x2="58" y2="53" stroke="#cbd5e1" strokeWidth="2" />
            {/* Athlete Hinged Posterior Chain */}
            <circle cx="36" cy="15" r="4.8" fill={bodyBase} stroke={bodyStroke} strokeWidth="1.5" />
            {/* Posterior Chain: Erector Spinae + Glutes + Hamstrings Highlighted */}
            <path
              d="M33 20 L21 31 C19 33 20 37 24 37 L33 26 Z"
              fill={primaryHot}
              stroke="#991b1b"
              strokeWidth="1.5"
            />
            {/* Hamstrings & Legs */}
            <path
              d="M22 35 L26 51 L31 51 L29 36 Z"
              fill={primaryHot}
              stroke="#991b1b"
              strokeWidth="1.4"
            />
            {/* Arms vertical */}
            <line x1="33" y1="23" x2="33" y2="43" stroke={secondaryHot} strokeWidth="3.2" strokeLinecap="round" />
            {/* Loaded Olympic Barbell */}
            <line x1="10" y1="44" x2="54" y2="44" stroke={equipColor} strokeWidth="3" />
            <circle cx="18" cy="44" r="8" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.5" />
            <circle cx="18" cy="44" r="2.5" fill="#f8fafc" />
            <circle cx="46" cy="44" r="8" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.5" />
            <circle cx="46" cy="44" r="2.5" fill="#f8fafc" />
          </svg>
        );

      case 'pull':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full">
            <rect width="64" height="64" rx="12" fill="#f1f5f9" />
            {/* Pull-up Bar */}
            <line x1="8" y1="10" x2="56" y2="10" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
            {/* Anatomical Back View - V-Taper Latissimus Dorsi Highlighted */}
            <circle cx="32" cy="19" r="4.5" fill={bodyBase} stroke={bodyStroke} strokeWidth="1.5" />
            {/* Arms pulling */}
            <path
              d="M17 11 L22 24 L26 25 M47 11 L42 24 L38 25"
              fill="none"
              stroke={secondaryHot}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Highlighted Latissimus Dorsi & Rhomboids */}
            <path
              d="M23 24 L41 24 L37 41 L27 41 Z"
              fill={primaryHot}
              stroke="#991b1b"
              strokeWidth="1.5"
            />
            {/* Spine midline */}
            <line x1="32" y1="24" x2="32" y2="40" stroke="#fee2e2" strokeWidth="1.2" />
            {/* Lower body */}
            <path d="M27 41 L26 55 M37 41 L38 55" stroke={bodyStroke} strokeWidth="4" strokeLinecap="round" />
          </svg>
        );

      case 'press':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full">
            <rect width="64" height="64" rx="12" fill="#f1f5f9" />
            {/* Anatomical Anterior/Lateral Deltoid Highlight */}
            <circle cx="32" cy="22" r="4.8" fill={bodyBase} stroke={bodyStroke} strokeWidth="1.5" />
            {/* Torso */}
            <path d="M25 29 L39 29 L37 47 L27 47 Z" fill={bodyBase} stroke={bodyStroke} strokeWidth="1.5" />
            {/* Highlighted Deltoid Caps (Shoulders) */}
            <circle cx="23" cy="30" r="4.5" fill={primaryHot} stroke="#991b1b" strokeWidth="1.4" />
            <circle cx="41" cy="30" r="4.5" fill={primaryHot} stroke="#991b1b" strokeWidth="1.4" />
            {/* Overhead Pressing Arms */}
            <path
              d="M20 29 L17 14 M44 29 L47 14"
              stroke={secondaryHot}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Barbell overhead */}
            <line x1="8" y1="13" x2="56" y2="13" stroke={equipColor} strokeWidth="2.6" />
            <rect x="11" y="7" width="3.5" height="12" rx="1" fill="#eab308" />
            <rect x="49.5" y="7" width="3.5" height="12" rx="1" fill="#eab308" />
          </svg>
        );

      case 'curl':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full">
            <rect width="64" height="64" rx="12" fill="#f1f5f9" />
            {/* Anatomical Arm & Biceps Brachii Peak Diagram */}
            <path
              d="M18 16 C18 28 18 40 24 44 L44 38 C46 35 44 31 39 32 L29 34 L27 16 Z"
              fill={bodyBase}
              stroke={bodyStroke}
              strokeWidth="1.6"
            />
            {/* Highlighted Biceps Brachii Muscle Belly */}
            <ellipse
              cx="27"
              cy="28"
              rx="6.5"
              ry="4.8"
              transform="rotate(-15 27 28)"
              fill={primaryHot}
              stroke="#991b1b"
              strokeWidth="1.5"
            />
            {/* Forearm & Hex Dumbbell */}
            <line x1="39" y1="22" x2="51" y2="28" stroke={equipColor} strokeWidth="3" strokeLinecap="round" />
            <rect x="35" y="18" width="5" height="8" rx="1.5" transform="rotate(25 37 22)" fill="#1e293b" />
            <rect x="48" y="24" width="5" height="8" rx="1.5" transform="rotate(25 50 28)" fill="#1e293b" />
          </svg>
        );

      case 'run':
      case 'bike':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full">
            <rect width="64" height="64" rx="12" fill="#ecfeff" />
            {/* Cardio Heart Rate & Lower Body Endurance Biomechanics */}
            <path
              d="M8 48 L18 48 L22 38 L27 54 L33 30 L38 48 L44 44 L56 44"
              fill="none"
              stroke="#0891b2"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M32 26 C32 26 22 19 22 13 C22 9.5 25 7 28 7 C30 7 31.5 8 32 9.5 C32.5 8 34 7 36 7 C39 7 42 9.5 42 13 C42 19 32 26 32 26 Z"
              fill={primaryHot}
              stroke="#991b1b"
              strokeWidth="1.4"
            />
          </svg>
        );

      default:
        // Core & Yoga Biomechanics
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full">
            <rect width="64" height="64" rx="12" fill="#f1f5f9" />
            <line x1="6" y1="47" x2="58" y2="47" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="15" cy="29" r="4.5" fill={bodyBase} stroke={bodyStroke} strokeWidth="1.5" />
            {/* Highlighted Rectus Abdominis & Transverse Core */}
            <path
              d="M20 30 L40 34 L39 40 L20 36 Z"
              fill={grp === 'core' ? primaryHot : secondaryHot}
              stroke="#991b1b"
              strokeWidth="1.5"
            />
            <path d="M18 33 L18 46 M40 36 L53 45" stroke={bodyStroke} strokeWidth="3.2" strokeLinecap="round" />
          </svg>
        );
    }
  };

  return (
    <div
      style={boxStyle}
      onClick={(e) => {
        if (showPhotoToggle && photoUrl) {
          e.stopPropagation();
          setUseRealPhoto(true);
        }
      }}
      className={`${
        size ? '' : sizeClass
      } rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 shrink-0 shadow-sm relative`}
      title={`${exercise.nameZh} — 主働肌：${exercise.primaryMusclesZh || exercise.muscleLabelZh}`}
    >
      {renderAnatomicalSvg()}
    </div>
  );
};
