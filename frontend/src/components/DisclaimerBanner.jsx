import { AlertTriangle } from 'lucide-react';

export default function DisclaimerBanner({ compact = false }) {
  return (
    <div className={`flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl ${compact ? 'p-3' : 'p-4'}`}>
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className={`text-amber-800 ${compact ? 'text-xs' : 'text-sm'} leading-relaxed`}>
        <span className="font-semibold">Medical Disclaimer: </span>
        This AI system is intended for screening assistance only and does not replace professional medical diagnosis.
        Always consult a qualified ophthalmologist for clinical evaluation and treatment decisions.
      </p>
    </div>
  );
}
