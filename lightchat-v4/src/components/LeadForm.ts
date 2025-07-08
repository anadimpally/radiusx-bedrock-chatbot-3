import { Lead } from '../types/types';

export class LeadForm {
  private element: HTMLDivElement;
  private onSubmit: (leadData: Lead) => void;
  private onSkip: () => void;

  constructor(containerId: string, onSubmit: (leadData: Lead) => void, onSkip: () => void) {
    this.onSubmit = onSubmit;
    this.onSkip = onSkip;
    this.element = this.createForm();
    this.attachEventListeners();

    // Append to container
    setTimeout(() => {
      const container = document.getElementById(containerId);
      if (container) {
        container.appendChild(this.element);
      } else {
        console.error(`Container with ID ${containerId} not found`);
      }
    }, 0);
  }

  private createForm(): HTMLDivElement {
    const formContainer = document.createElement('div');
    formContainer.className = 'lead-form-container';
    formContainer.id = 'lead-form-container';

    formContainer.style.maxHeight = '70vh';
    formContainer.style.overflowY = 'auto';

    // Form header
    const header = document.createElement('div');
    header.className = 'lead-form-header';

    const title = document.createElement('h3');
    title.textContent = 'Before we start chatting...';
    title.className = 'lead-form-title';
    header.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Please share a bit about yourself so we can personalize your experience.';
    subtitle.className = 'lead-form-subtitle';
    header.appendChild(subtitle);

    formContainer.appendChild(header);

    // Form fields
    const form = document.createElement('form');
    form.id = 'lead-form';
    form.className = 'lead-form';

    // Name field
    const nameGroup = this.createFormGroup('name', 'Name', 'text', 'Your name');
    form.appendChild(nameGroup);

    // Email field
    const emailGroup = this.createFormGroup('email', 'Email', 'email', 'Your email address');
    form.appendChild(emailGroup);

    // Phone field
    const phoneGroup = this.createFormGroup('phone', 'Phone', 'tel', 'Your phone number');
    form.appendChild(phoneGroup);

    // Country field
    const countryGroup = this.createFormGroup('country', 'Country', 'text', 'Your country');
    form.appendChild(countryGroup);

    // State/Province field
    const stateGroup = this.createFormGroup('state', 'State/Province', 'text', 'Your state or province');
    form.appendChild(stateGroup);

    // City field
    const cityGroup = this.createFormGroup('city', 'City', 'text', 'Your city');
    form.appendChild(cityGroup);

    // Interested Program field
    const programGroup = this.createFormGroup('program', 'Interested Program', 'text', 'Program you are interested in');
    form.appendChild(programGroup);

    // Buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'lead-form-buttons';

    // Submit button
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.id = 'lead-submit-btn';
    submitButton.className = 'lead-submit-btn';
    submitButton.textContent = 'Submit';
    submitButton.style.backgroundColor = '#d32f2f';
    submitButton.style.color = 'white';
    buttonsContainer.appendChild(submitButton);

    // Skip button
    const skipButton = document.createElement('button');
    skipButton.type = 'button';
    skipButton.id = 'lead-skip-btn';
    skipButton.className = 'lead-skip-btn';
    skipButton.textContent = 'Skip for now';
    buttonsContainer.appendChild(skipButton);

    form.appendChild(buttonsContainer);
    formContainer.appendChild(form);

    // Apply styles
    this.applyStyles(formContainer);

    return formContainer;
  }

  private createFormGroup(id: string, label: string, type: string, placeholder: string): HTMLDivElement {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';

    const labelElement = document.createElement('label');
    labelElement.htmlFor = id;
    labelElement.textContent = label;
    formGroup.appendChild(labelElement);

    const input = document.createElement('input');
    input.type = type;
    input.id = id;
    input.name = id;
    input.placeholder = placeholder;

    // Only make email required
    if (id === 'email') {
      input.required = true;
    }

    formGroup.appendChild(input);

    return formGroup;
  }

  private applyStyles(container: HTMLDivElement): void {
    // Form container styles
    container.style.backgroundColor = 'white';
    container.style.borderRadius = '8px';
    container.style.padding = '20px';
    container.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.maxWidth = '';
    container.style.margin = '';
    container.style.padding = '0';
    container.style.boxShadow = '';

    // Ensure the form inside also fills the container
    const form = container.querySelector('.lead-form') as HTMLFormElement;
    if (form) {
      form.style.width = '100%';
      form.style.height = '100%';
      form.style.margin = '0';
      form.style.padding = '0';
    }

    // Header styles
    const header = container.querySelector('.lead-form-header') as HTMLDivElement;
    if (header) {
      header.style.textAlign = 'center';
      header.style.marginBottom = '10px';

      const title = header.querySelector('.lead-form-title') as HTMLHeadingElement;
      if (title) {
        title.style.fontSize = '18px';
        title.style.marginBottom = '8px';
        title.style.color = '#2d3748';
      }

      const subtitle = header.querySelector('.lead-form-subtitle') as HTMLParagraphElement;
      if (subtitle) {
        subtitle.style.fontSize = '14px';
        subtitle.style.color = '#718096';
        subtitle.style.margin = '0';
      }
    }

    // Form styles
    if (form) {
      form.style.display = 'flex';
      form.style.flexDirection = 'column';
      form.style.gap = '15px';

      // Style all form groups
      const formGroups = form.querySelectorAll('.form-group');
      formGroups.forEach((group: Element) => {
        const groupElement = group as HTMLDivElement;
        groupElement.style.display = 'flex';
        groupElement.style.flexDirection = 'column';
        groupElement.style.gap = '5px';

        const label = groupElement.querySelector('label') as HTMLLabelElement;
        if (label) {
          label.style.fontSize = '14px';
          label.style.fontWeight = '500';
          label.style.color = '#4a5568';
        }

        const input = groupElement.querySelector('input') as HTMLInputElement;
        if (input) {
          input.style.padding = '10px';
          input.style.borderRadius = '6px';
          input.style.border = '1px solid #e2e8f0';
          input.style.fontSize = '14px';
          input.style.outline = 'none';
          input.style.transition = 'border-color 0.3s ease';
        }
      });

      // Button container styles
      const buttonsContainer = form.querySelector('.lead-form-buttons') as HTMLDivElement;
      if (buttonsContainer) {
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.justifyContent = 'space-between';
        buttonsContainer.style.marginTop = '10px';

        // Submit button styles
        const submitBtn = buttonsContainer.querySelector('.lead-submit-btn') as HTMLButtonElement;
        if (submitBtn) {
          submitBtn.style.backgroundColor = '#d32f2f';
          submitBtn.style.color = 'white';
          submitBtn.style.border = 'none';
          submitBtn.style.padding = '10px 20px';
          submitBtn.style.borderRadius = '6px';
          submitBtn.style.cursor = 'pointer';
          submitBtn.style.fontSize = '14px';
          submitBtn.style.fontWeight = '500';
          submitBtn.style.transition = 'background-color 0.3s ease';
        }

        // Skip button styles
        const skipBtn = buttonsContainer.querySelector('.lead-skip-btn') as HTMLButtonElement;
        if (skipBtn) {
          skipBtn.style.backgroundColor = 'transparent';
          skipBtn.style.color = '#718096';
          skipBtn.style.border = 'none';
          skipBtn.style.padding = '10px';
          skipBtn.style.borderRadius = '6px';
          skipBtn.style.cursor = 'pointer';
          skipBtn.style.fontSize = '14px';
          skipBtn.style.transition = 'color 0.3s ease';
          skipBtn.style.textDecoration = 'underline';
        }
      }
    }
  }

  private attachEventListeners(): void {
    const form = this.element.querySelector('#lead-form') as HTMLFormElement;
    const skipButton = this.element.querySelector('#lead-skip-btn') as HTMLButtonElement;

    // Form submission
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const leadData: Lead = {
          name: formData.get('name') as string || '',
          email: formData.get('email') as string || '',
          phone: formData.get('phone') as string || '',
          country: formData.get('country') as string || '',
          state: formData.get('state') as string || '',
          city: formData.get('city') as string || '',
          program: formData.get('program') as string || '',
          timestamp: Date.now(),
          userId: formData.get('userId') as string || ''
        };

        this.onSubmit(leadData);
      });
    }

    // Skip button
    if (skipButton) {
      skipButton.addEventListener('click', () => {
        this.onSkip();
      });
    }
  }

  /**
   * Show or hide the form
   */
  public toggle(isVisible: boolean): void {
    this.element.style.display = isVisible ? 'flex' : 'none';
  }

  /**
   * Remove the form from the DOM
   */
  public remove(): void {
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}