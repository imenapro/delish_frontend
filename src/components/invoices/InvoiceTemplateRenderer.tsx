import { ClassicTemplate } from './templates/ClassicTemplate';
import { ModernTemplate } from './templates/ModernTemplate';
import { MinimalistTemplate } from './templates/MinimalistTemplate';
import { BoldTemplate } from './templates/BoldTemplate';
import { ProfessionalTemplate } from './templates/ProfessionalTemplate';
import { InvoiceTemplateProps } from './types';

interface RendererProps extends InvoiceTemplateProps {
  templateId: string;
}
<<<<<<< HEAD

=======
// invoice
>>>>>>> development
export function InvoiceTemplateRenderer({ templateId, ...props }: RendererProps) {
  switch (templateId) {
    case 'modern':
      return <ModernTemplate {...props} />;
    case 'minimalist':
      return <MinimalistTemplate {...props} />;
    case 'bold':
      return <BoldTemplate {...props} />;
    case 'professional':
      return <ProfessionalTemplate {...props} />;
    case 'classic':
    default:
      return <ClassicTemplate {...props} />;
  }
}

export const AVAILABLE_TEMPLATES = [
  { id: 'classic', name: 'Classic', description: 'Timeless and formal design' },
  { id: 'modern', name: 'Modern', description: 'Clean lines with colorful headers' },
  { id: 'minimalist', name: 'Minimalist', description: 'Simple, focused on typography' },
  { id: 'bold', name: 'Bold', description: 'High contrast and strong impact' },
  { id: 'professional', name: 'Professional', description: 'Structured and corporate' },
];
