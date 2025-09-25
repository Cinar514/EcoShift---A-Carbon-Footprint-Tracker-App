// CO₂ Footprint Challenge - Frontend JavaScript

class CO2Challenge {
    constructor() {
        this.currentUser = null;
        this.userHabits = [];
        this.allHabits = [];
        this.dashboardData = null;
        this.charts = {};
        this.allProfiles = [];
        this.preferences = this.loadPreferences();
        
        this.init();
    }

    async init() {
        try {
            console.log('Starting initialization...');
            
            // Set default date to today
            const today = new Date().toISOString().split('T')[0];
            
            // Safely set default dates (elements might not exist yet)
            const logDate = document.getElementById('log-date');
            const internshipStart = document.getElementById('internship-start');
            
            if (logDate) logDate.value = today;
            if (internshipStart) internshipStart.value = today;
            
            // Set default quantity from preferences
            const quantityField = document.getElementById('log-quantity');
            if (quantityField) quantityField.value = this.preferences.defaultQuantity;

            console.log('Loading habits...');
            // Load habits
            await this.loadHabits();
            
            console.log('Checking for saved user...');
            // Check for existing user in localStorage
            const savedUser = localStorage.getItem('co2challenge_user');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                await this.loadUserHabits();
                this.updateCurrentUserDisplay();
                this.showSection('dashboard');
            }
            
            console.log('Loading profiles...');
            // Load all available profiles
            await this.loadAllProfiles();

            console.log('Setting up event listeners...');
            // Set up event listeners
            this.setupEventListeners();
            this.setupFormValidation();
            this.setupAutoSave();
            
            // Restore saved form data
            setTimeout(() => this.restoreFormData(), 500);
            
            console.log('Initialization complete!');
        } catch (error) {
            console.error('Error during initialization:', error);
            // Don't throw the error, just log it and continue with basic functionality
        }
    }

    setupEventListeners() {
        // Profile form
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createUser();
            });
        }

        // Habit selection
        const saveHabits = document.getElementById('save-habits');
        if (saveHabits) {
            saveHabits.addEventListener('click', () => {
                this.saveUserHabits();
            });
        }

        // Log form
        const logForm = document.getElementById('log-form');
        if (logForm) {
            logForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.logAction();
            });
        }

        // Date range picker for dashboard
        this.setupDateRangePicker();
    }

    setupFormValidation() {
        // Real-time validation for name field
        const nameField = document.getElementById('name');
        if (nameField) {
            nameField.addEventListener('blur', (e) => {
                const name = e.target.value.trim();
                if (name) {
                    const duplicateCheck = this.checkForDuplicateProfile(name, '');
                    if (duplicateCheck.isDuplicate) {
                        this.showValidationError(e.target, 'This name is already taken');
                    } else {
                        this.clearValidationError(e.target);
                    }
                }
            });
        }

        // Real-time validation for email field
        const emailField = document.getElementById('email');
        if (emailField) {
            emailField.addEventListener('blur', (e) => {
                const email = e.target.value.trim();
                if (email) {
                    if (!this.isValidEmail(email)) {
                        this.showValidationError(e.target, 'Please enter a valid email address');
                    } else {
                        // Check for duplicate email
                        const duplicateCheck = this.checkForDuplicateProfile('', email);
                        if (duplicateCheck.isDuplicate) {
                            this.showValidationError(e.target, 'This email is already registered');
                        } else {
                            this.clearValidationError(e.target);
                        }
                    }
                } else {
                    this.clearValidationError(e.target);
                }
            });
        }

        // Real-time validation for quantity field
        const quantityField = document.getElementById('log-quantity');
        if (quantityField) {
            quantityField.addEventListener('input', (e) => {
                const quantity = parseFloat(e.target.value);
                if (e.target.value && (isNaN(quantity) || quantity <= 0 || quantity > 1000)) {
                    this.showValidationError(e.target, 'Enter a number between 0.1 and 1000');
                } else {
                    this.clearValidationError(e.target);
                }
            });
        }

        // Real-time validation for notes field
        const notesField = document.getElementById('log-notes');
        if (notesField) {
            notesField.addEventListener('input', (e) => {
                const remaining = 500 - e.target.value.length;
                let helpText = notesField.parentElement.querySelector('.char-counter');
                if (!helpText) {
                    helpText = document.createElement('small');
                    helpText.className = 'char-counter form-text';
                    notesField.parentElement.appendChild(helpText);
                }
                
                if (remaining < 0) {
                    helpText.textContent = `Notes are ${Math.abs(remaining)} characters too long`;
                    helpText.className = 'char-counter form-text text-danger';
                    this.showValidationError(e.target, 'Notes are too long');
                } else {
                    helpText.textContent = `${remaining} characters remaining`;
                    helpText.className = 'char-counter form-text text-muted';
                    this.clearValidationError(e.target);
                }
            });
        }
    }

    setupAutoSave() {
        // Auto-save profile form
        const profileFields = ['name', 'email', 'internship-start'];
        profileFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => {
                    this.autoSaveProfileForm();
                });
                field.addEventListener('change', () => {
                    this.autoSaveProfileForm();
                });
            }
        });

        // Auto-save log form
        const logFields = ['log-quantity', 'log-notes'];
        logFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => {
                    this.autoSaveLogForm();
                });
            }
        });

        // Save preferences when they change
        this.preferences.lastActiveSection = 'welcome';
        this.savePreferences();
    }

    autoSaveProfileForm() {
        const nameField = document.getElementById('name');
        const emailField = document.getElementById('email');
        const internshipField = document.getElementById('internship-start');
        
        const data = {
            name: nameField?.value || '',
            email: emailField?.value || '',
            internshipStart: internshipField?.value || ''
        };
        
        // Only save if there's actual data
        if (data.name.trim() || data.email.trim() || data.internshipStart) {
            this.saveFormData('profile-form', data);
            this.showAutoSaveIndicator('profile');
        }
    }

    autoSaveLogForm() {
        const quantityField = document.getElementById('log-quantity');
        const notesField = document.getElementById('log-notes');
        
        const data = {
            quantity: quantityField?.value || this.preferences.defaultQuantity,
            notes: notesField?.value || ''
        };
        
        // Only save if there's meaningful data
        if (data.notes.trim() || (data.quantity && data.quantity !== '1')) {
            this.saveFormData('log-form', data);
        }
    }

    showAutoSaveIndicator(formType) {
        // Show a subtle auto-save indicator
        let indicator = document.getElementById(`auto-save-${formType}`);
        if (!indicator) {
            indicator = document.createElement('small');
            indicator.id = `auto-save-${formType}`;
            indicator.className = 'text-success';
            indicator.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 1000; opacity: 0; transition: opacity 0.3s;';
            indicator.innerHTML = '<i class="fas fa-check-circle me-1"></i>Draft saved';
            document.body.appendChild(indicator);
        }
        
        // Show indicator
        indicator.style.opacity = '1';
        
        // Hide after 2 seconds
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 2000);
    }

    showValidationError(field, message) {
        field.classList.add('is-invalid');
        let errorDiv = field.parentElement.querySelector('.invalid-feedback');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            field.parentElement.appendChild(errorDiv);
        }
        errorDiv.textContent = message;
    }

    clearValidationError(field) {
        field.classList.remove('is-invalid');
        const errorDiv = field.parentElement.querySelector('.invalid-feedback');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    setupDateRangePicker() {
        // Check if dashboard section exists
        const dashboardHeader = document.querySelector('#dashboard-section h2');
        if (!dashboardHeader) {
            // Dashboard not loaded yet, skip for now
            return;
        }
        
        // Check if date controls already exist
        if (dashboardHeader.parentNode.querySelector('.date-controls')) {
            return;
        }
        
        // Create enhanced date range picker
        const dateControls = document.createElement('div');
        dateControls.className = 'date-controls card p-3 mb-4 bg-light';
        dateControls.innerHTML = `
            <div class="row align-items-center">
                <div class="col-md-12">
                    <h5 class="mb-3"><i class="fas fa-calendar-alt me-2"></i>Filter by Date Range</h5>
                </div>
                <div class="col-md-3">
                    <label for="dashboard-start-date" class="form-label fw-bold">From Date:</label>
                    <input type="date" id="dashboard-start-date" class="form-control" />
                </div>
                <div class="col-md-3">
                    <label for="dashboard-end-date" class="form-label fw-bold">To Date:</label>
                    <input type="date" id="dashboard-end-date" class="form-control" />
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold">Quick Select:</label>
                    <div class="btn-group w-100" role="group">
                        <button type="button" class="btn btn-outline-primary btn-sm" data-range="7">Last 7 days</button>
                        <button type="button" class="btn btn-outline-primary btn-sm" data-range="30">Last 30 days</button>
                        <button type="button" class="btn btn-outline-primary btn-sm" data-range="90">Last 3 months</button>
                    </div>
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold">Actions:</label>
                    <div class="d-grid gap-2">
                        <button type="button" id="update-dashboard" class="btn btn-success btn-sm">
                            <i class="fas fa-sync me-1"></i>Update Dashboard
                        </button>
                        <button type="button" id="reset-dates" class="btn btn-outline-secondary btn-sm">
                            <i class="fas fa-undo me-1"></i>Reset
                        </button>
                    </div>
                </div>
                <div class="col-12 mt-3">
                    <div id="date-range-info" class="alert alert-info d-none">
                        <i class="fas fa-info-circle me-2"></i>
                        <span id="date-range-text"></span>
                    </div>
                </div>
            </div>
        `;
        
        // Insert after dashboard header
        dashboardHeader.parentNode.insertBefore(dateControls, dashboardHeader.nextSibling);
        
        // Set default dates (last 30 days)
        this.setDateRange(30);
        
        // Add event listeners
        this.setupDateRangeEvents();
    }

    setupDateRangeEvents() {
        // Quick date range buttons
        document.querySelectorAll('[data-range]').forEach(button => {
            button.addEventListener('click', (e) => {
                const days = parseInt(e.target.dataset.range);
                this.setDateRange(days);
                this.updateDateRangeInfo();
                
                // Highlight active button
                document.querySelectorAll('[data-range]').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Update button
        const updateBtn = document.getElementById('update-dashboard');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => {
                this.updateDashboard();
                this.showAutoSaveIndicator('dashboard');
            });
        }
        
        // Reset button
        const resetBtn = document.getElementById('reset-dates');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.setDateRange(30);
                this.updateDateRangeInfo();
                this.updateDashboard();
                // Reset active button
                document.querySelectorAll('[data-range]').forEach(btn => btn.classList.remove('active'));
                document.querySelector('[data-range="30"]').classList.add('active');
            });
        }
        
        // Date input change events
        const startDate = document.getElementById('dashboard-start-date');
        const endDate = document.getElementById('dashboard-end-date');
        
        if (startDate) {
            startDate.addEventListener('change', () => {
                this.validateDateRange();
                this.updateDateRangeInfo();
            });
        }
        
        if (endDate) {
            endDate.addEventListener('change', () => {
                this.validateDateRange();
                this.updateDateRangeInfo();
            });
        }
        
        // Initialize date range info
        this.updateDateRangeInfo();
        
        // Set default active button
        document.querySelector('[data-range="30"]')?.classList.add('active');
    }
    
    setDateRange(days) {
        const today = new Date();
        const startDate = new Date(today.getTime() - (days * 24 * 60 * 60 * 1000));
        
        const startInput = document.getElementById('dashboard-start-date');
        const endInput = document.getElementById('dashboard-end-date');
        
        if (startInput) startInput.value = startDate.toISOString().split('T')[0];
        if (endInput) endInput.value = today.toISOString().split('T')[0];
    }
    
    validateDateRange() {
        const startInput = document.getElementById('dashboard-start-date');
        const endInput = document.getElementById('dashboard-end-date');
        
        if (!startInput || !endInput) return true;
        
        const startDate = new Date(startInput.value);
        const endDate = new Date(endInput.value);
        
        if (startDate > endDate) {
            this.showError('Start date cannot be later than end date. Please adjust your selection.');
            startInput.focus();
            return false;
        }
        
        const today = new Date();
        if (startDate > today) {
            this.showError('Start date cannot be in the future.');
            startInput.focus();
            return false;
        }
        
        return true;
    }
    
    updateDateRangeInfo() {
        const startInput = document.getElementById('dashboard-start-date');
        const endInput = document.getElementById('dashboard-end-date');
        const infoDiv = document.getElementById('date-range-info');
        const infoText = document.getElementById('date-range-text');
        
        if (!startInput || !endInput || !infoDiv || !infoText) return;
        
        const startDate = new Date(startInput.value);
        const endDate = new Date(endInput.value);
        
        if (startInput.value && endInput.value) {
            const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            const startFormatted = this.formatDate(startInput.value);
            const endFormatted = this.formatDate(endInput.value);
            
            infoText.textContent = `Showing data from ${startFormatted} to ${endFormatted} (${daysDiff} days)`;
            infoDiv.classList.remove('d-none');
        } else {
            infoDiv.classList.add('d-none');
        }
    }

    async loadHabits() {
        try {
            const response = await fetch('/api/habits');
            this.allHabits = await response.json();
            this.renderHabits();
        } catch (error) {
            console.error('Error loading habits:', error);
            this.showError('Unable to load sustainable habits. Please check your internet connection and try refreshing the page.');
        }
    }

    renderHabits() {
        const container = document.getElementById('habits-container');
        container.innerHTML = '';

        // Group habits by category
        const categories = {};
        this.allHabits.forEach(habit => {
            if (!categories[habit.category]) {
                categories[habit.category] = [];
            }
            categories[habit.category].push(habit);
        });

        Object.keys(categories).forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'col-12 mb-3';
            categoryDiv.innerHTML = `<h6 class="text-muted mb-2"><i class="fas fa-folder me-1"></i>${category}</h6>`;
            
            const habitsRow = document.createElement('div');
            habitsRow.className = 'row g-2';

            categories[category].forEach(habit => {
                const habitCard = document.createElement('div');
                habitCard.className = 'col-md-6 col-lg-4';
                habitCard.innerHTML = `
                    <div class="card habit-card" data-habit-id="${habit.id}">
                        <div class="card-body text-center">
                            <div class="habit-icon category-${habit.category.toLowerCase()}">
                                ${this.getHabitIcon(habit.category)}
                            </div>
                            <h6 class="card-title">${habit.name}</h6>
                            <p class="card-text small text-muted">${habit.description}</p>
                            <div class="habit-co2">
                                <i class="fas fa-leaf me-1"></i>${habit.co2_savings_per_action} kg CO₂/${habit.unit}
                            </div>
                        </div>
                    </div>
                `;
                
                habitCard.addEventListener('click', () => this.toggleHabitSelection(habit.id));
                habitsRow.appendChild(habitCard);
            });

            categoryDiv.appendChild(habitsRow);
            container.appendChild(categoryDiv);
        });
    }

    getHabitIcon(category) {
        const icons = {
            'Transport': '<i class="fas fa-bicycle"></i>',
            'Food': '<i class="fas fa-apple-alt"></i>',
            'Energy': '<i class="fas fa-bolt"></i>',
            'Waste': '<i class="fas fa-recycle"></i>',
            'Water': '<i class="fas fa-tint"></i>'
        };
        return icons[category] || '<i class="fas fa-leaf"></i>';
    }

    toggleHabitSelection(habitId) {
        const card = document.querySelector(`[data-habit-id="${habitId}"]`);
        const isSelected = card.classList.contains('selected');
        
        if (isSelected) {
            card.classList.remove('selected');
        } else {
            // Check if we already have 5 habits selected
            const selectedCount = document.querySelectorAll('.habit-card.selected').length;
            if (selectedCount >= 5) {
                this.showError('You can select a maximum of 5 habits. Please unselect one habit before choosing a new one.');
                return;
            }
            card.classList.add('selected');
        }
        
        this.updateHabitSelection();
    }

    updateHabitSelection() {
        const selectedCards = document.querySelectorAll('.habit-card.selected');
        const count = selectedCards.length;
        const countElement = document.getElementById('habit-count');
        const saveButton = document.getElementById('save-habits');
        
        countElement.textContent = `${count} habit${count !== 1 ? 's' : ''} selected`;
        saveButton.disabled = count < 3;
        
        if (count < 3) {
            countElement.className = 'ms-3 text-muted';
        } else {
            countElement.className = 'ms-3 text-success fw-bold';
        }
    }

    async createUser() {
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const internshipStart = document.getElementById('internship-start').value;
        
        // Form validation
        if (!name) {
            this.showError('Please enter your full name.');
            document.getElementById('name').focus();
            return;
        }
        
        if (name.length < 2) {
            this.showError('Name must be at least 2 characters long.');
            document.getElementById('name').focus();
            return;
        }
        
        if (email && !this.isValidEmail(email)) {
            this.showError('Please enter a valid email address (e.g., john@example.com).');
            document.getElementById('email').focus();
            return;
        }
        
        if (!internshipStart) {
            this.showError('Please select your internship start date.');
            document.getElementById('internship-start').focus();
            return;
        }
        
        if (this.isFutureDate(internshipStart)) {
            this.showError('Internship start date cannot be more than 1 year in the future.');
            document.getElementById('internship-start').focus();
            return;
        }
        
        // Check for duplicate profiles (client-side quick check)
        const duplicateCheck = this.checkForDuplicateProfile(name, email);
        if (duplicateCheck.isDuplicate) {
            this.showError(duplicateCheck.message);
            if (duplicateCheck.focusField === 'name') {
                document.getElementById('name').focus();
                document.getElementById('name').select();
            } else if (duplicateCheck.focusField === 'email') {
                document.getElementById('email').focus();
                document.getElementById('email').select();
            }
            return;
        }

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    email,
                    internship_start_date: internshipStart
                })
            });

            if (response.ok) {
                this.currentUser = await response.json();
                localStorage.setItem('co2challenge_user', JSON.stringify(this.currentUser));
                this.updateCurrentUserDisplay();
                await this.loadAllProfiles();
                // Clear saved form data after successful profile creation
                this.clearFormData('profile-form');
                this.showSuccess('Profile created successfully! Now select your habits.');
                document.getElementById('habit-selection').style.display = 'block';
            } else if (response.status === 409) {
                // Handle duplicate profile error
                const errorData = await response.json();
                this.showError(errorData.error);
                
                // Focus on the relevant field based on error type
                if (errorData.type === 'duplicate_name' || errorData.type === 'duplicate_both') {
                    document.getElementById('name').focus();
                    document.getElementById('name').select();
                } else if (errorData.type === 'duplicate_email') {
                    document.getElementById('email').focus();
                    document.getElementById('email').select();
                }
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Failed to create profile' }));
                throw new Error(errorData.error || 'Failed to create profile');
            }
        } catch (error) {
            console.error('Error creating user:', error);
            this.showError('Unable to create your profile. Please check that all fields are filled correctly and try again.');
        }
    }

    async saveUserHabits() {
        const selectedCards = document.querySelectorAll('.habit-card.selected');
        const habitIds = Array.from(selectedCards).map(card => 
            parseInt(card.dataset.habitId)
        );

        try {
            const response = await fetch(`/api/users/${this.currentUser.id}/habits`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ habitIds })
            });

            if (response.ok) {
                await this.loadUserHabits();
                this.showSuccess('Habits selected successfully! You can now start logging your actions.');
                this.showSection('tracker');
            } else {
                throw new Error('Failed to save habits');
            }
        } catch (error) {
            console.error('Error saving habits:', error);
            this.showError('Failed to save habits. Please try again.');
        }
    }

    async loadUserHabits() {
        if (!this.currentUser) return;

        try {
            const response = await fetch(`/api/users/${this.currentUser.id}/habits`);
            this.userHabits = await response.json();
            this.populateLogHabitSelect();
        } catch (error) {
            console.error('Error loading user habits:', error);
        }
    }

    populateLogHabitSelect() {
        const select = document.getElementById('log-habit');
        select.innerHTML = '<option value="">Choose a habit...</option>';
        
        this.userHabits.forEach(habit => {
            const option = document.createElement('option');
            option.value = habit.id;
            option.textContent = `${habit.name} (${habit.co2_savings_per_action} kg CO₂/${habit.unit})`;
            select.appendChild(option);
        });
    }

    async logAction() {
        const habitId = document.getElementById('log-habit').value;
        const date = document.getElementById('log-date').value;
        const quantity = parseFloat(document.getElementById('log-quantity').value);
        const notes = document.getElementById('log-notes').value.trim();

        // Enhanced form validation
        if (!habitId) {
            this.showError('Please select a sustainable habit from the dropdown menu.');
            document.getElementById('log-habit').focus();
            return;
        }
        
        if (!date) {
            this.showError('Please select the date when you performed this action.');
            document.getElementById('log-date').focus();
            return;
        }
        
        if (this.isPastDate(date)) {
            this.showError('You cannot log actions for future dates. Please select today or a past date.');
            document.getElementById('log-date').focus();
            return;
        }
        
        if (!quantity || isNaN(quantity)) {
            this.showError('Please enter a valid number for quantity.');
            document.getElementById('log-quantity').focus();
            return;
        }
        
        if (quantity <= 0) {
            this.showError('Quantity must be greater than 0.');
            document.getElementById('log-quantity').focus();
            return;
        }
        
        if (quantity > 1000) {
            this.showError('Quantity seems too high. Please enter a reasonable value (maximum 1000).');
            document.getElementById('log-quantity').focus();
            return;
        }
        
        // Check if notes are too long
        if (notes.length > 500) {
            this.showError('Notes are too long. Please keep them under 500 characters.');
            document.getElementById('log-notes').focus();
            return;
        }

        try {
            const response = await fetch('/api/logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: this.currentUser.id,
                    habit_id: parseInt(habitId),
                    date,
                    quantity,
                    notes
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.showSuccess(`🌱 Excellent! You saved ${result.co2_saved.toFixed(2)} kg of CO₂ with this action. Keep up the great work!`);
                document.getElementById('log-form').reset();
                document.getElementById('log-date').value = new Date().toISOString().split('T')[0];
                document.getElementById('log-quantity').value = this.preferences.defaultQuantity;
                // Clear saved form data after successful log
                this.clearFormData('log-form');
                this.loadMyLogs();
                this.updateDashboard();
            } else {
                throw new Error('Failed to log action');
            }
        } catch (error) {
            console.error('Error logging action:', error);
            this.showError('Failed to log action. Please try again.');
        }
    }

    async loadMyLogs() {
        if (!this.currentUser) return;

        try {
            const response = await fetch(`/api/users/${this.currentUser.id}/logs`);
            const logs = await response.json();
            this.renderMyLogs(logs);
        } catch (error) {
            console.error('Error loading logs:', error);
        }
    }

    renderMyLogs(logs) {
        const container = document.getElementById('my-logs');
        
        if (logs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h5>No actions logged yet</h5>
                    <p>Start logging your sustainable actions to see them here!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = logs.slice(0, 10).map(log => `
            <div class="log-entry">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${log.habit_name}</h6>
                        <div class="log-date">
                            <i class="fas fa-calendar me-1"></i>${this.formatDate(log.date)}
                            <span class="ms-3">
                                <i class="fas fa-hashtag me-1"></i>${log.quantity} ${log.unit}
                            </span>
                        </div>
                        ${log.notes ? `<div class="log-notes">"${log.notes}"</div>` : ''}
                    </div>
                    <div class="log-co2">
                        <i class="fas fa-leaf me-1"></i>${log.co2_saved.toFixed(2)} kg CO₂
                    </div>
                </div>
            </div>
        `).join('');
    }

    async updateDashboard() {
        const startDate = document.getElementById('dashboard-start-date')?.value;
        const endDate = document.getElementById('dashboard-end-date')?.value;
        
        let url = '/api/dashboard';
        if (startDate && endDate) {
            url += `?startDate=${startDate}&endDate=${endDate}`;
        }

        try {
            const response = await fetch(url);
            this.dashboardData = await response.json();
            this.renderDashboard();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    renderDashboard() {
        if (!this.dashboardData) return;

        // Update summary cards with enhanced information
        this.updateSummaryCards();
        
        // Show loading state for charts
        this.showChartLoading(true);

        // Render charts with enhanced data
        setTimeout(() => {
            this.renderCategoryChart();
            this.renderLeaderboardChart();
            this.renderRecentActivity();
            this.showChartLoading(false);
        }, 300);
        
        // Update date range summary
        this.updateDashboardSummary();
    }
    
    updateSummaryCards() {
        const totalCo2 = this.dashboardData.total_co2_saved || 0;
        const totalUsers = this.dashboardData.total_users || 0;
        const totalActions = this.dashboardData.total_actions || 0;
        
        // Enhanced CO2 display
        const co2Element = document.getElementById('total-co2');
        if (co2Element) {
            co2Element.innerHTML = `
                <div class="d-flex flex-column">
                    <span class="fs-4 fw-bold">${totalCo2.toFixed(1)} kg</span>
                    <small class="text-light opacity-75">CO₂ Saved</small>
                </div>
            `;
        }
        
        // Enhanced users display
        const usersElement = document.getElementById('total-users');
        if (usersElement) {
            usersElement.innerHTML = `
                <div class="d-flex flex-column">
                    <span class="fs-4 fw-bold">${totalUsers}</span>
                    <small class="text-light opacity-75">Active Users</small>
                </div>
            `;
        }
        
        // Enhanced actions display
        const actionsElement = document.getElementById('total-actions');
        if (actionsElement) {
            actionsElement.innerHTML = `
                <div class="d-flex flex-column">
                    <span class="fs-4 fw-bold">${totalActions}</span>
                    <small class="text-light opacity-75">Total Actions</small>
                </div>
            `;
        }
        
        // Enhanced average display
        const avgCo2 = totalUsers > 0 ? (totalCo2 / totalUsers).toFixed(1) : '0';
        const avgElement = document.getElementById('avg-co2');
        if (avgElement) {
            avgElement.innerHTML = `
                <div class="d-flex flex-column">
                    <span class="fs-4 fw-bold">${avgCo2} kg</span>
                    <small class="text-light opacity-75">Avg per Person</small>
                </div>
            `;
        }
    }
    
    showChartLoading(show) {
        const charts = ['categoryChart', 'leaderboardChart'];
        charts.forEach(chartId => {
            const container = document.getElementById(chartId)?.parentElement;
            if (container) {
                if (show) {
                    container.style.position = 'relative';
                    if (!container.querySelector('.chart-loading')) {
                        const loader = document.createElement('div');
                        loader.className = 'chart-loading d-flex align-items-center justify-content-center';
                        loader.style.cssText = `
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: rgba(255,255,255,0.8);
                            z-index: 10;
                        `;
                        loader.innerHTML = '<div class="spinner-border text-success" role="status"><span class="visually-hidden">Loading...</span></div>';
                        container.appendChild(loader);
                    }
                } else {
                    const loader = container.querySelector('.chart-loading');
                    if (loader) loader.remove();
                }
            }
        });
    }
    
    updateDashboardSummary() {
        const startInput = document.getElementById('dashboard-start-date');
        const endInput = document.getElementById('dashboard-end-date');
        
        if (startInput && endInput && startInput.value && endInput.value) {
            // Add period summary to dashboard
            let summaryDiv = document.querySelector('.dashboard-period-summary');
            if (!summaryDiv) {
                summaryDiv = document.createElement('div');
                summaryDiv.className = 'dashboard-period-summary alert alert-success mt-3';
                const dashboardSection = document.getElementById('dashboard-section');
                const summaryCards = dashboardSection.querySelector('.row.mb-4');
                summaryCards.parentNode.insertBefore(summaryDiv, summaryCards.nextSibling);
            }
            
            const startDate = new Date(startInput.value);
            const endDate = new Date(endInput.value);
            const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            const dailyAvg = this.dashboardData.total_actions > 0 ? 
                (this.dashboardData.total_actions / daysDiff).toFixed(1) : '0';
            
            summaryDiv.innerHTML = `
                <div class="row text-center">
                    <div class="col-md-3">
                        <i class="fas fa-calendar-day fa-2x mb-2 text-success"></i>
                        <h6>${daysDiff} Days</h6>
                        <small>Selected Period</small>
                    </div>
                    <div class="col-md-3">
                        <i class="fas fa-chart-line fa-2x mb-2 text-success"></i>
                        <h6>${dailyAvg}</h6>
                        <small>Actions per Day</small>
                    </div>
                    <div class="col-md-3">
                        <i class="fas fa-leaf fa-2x mb-2 text-success"></i>
                        <h6>${(this.dashboardData.total_co2_saved / daysDiff).toFixed(2)} kg</h6>
                        <small>CO₂ Saved per Day</small>
                    </div>
                    <div class="col-md-3">
                        <i class="fas fa-tree fa-2x mb-2 text-success"></i>
                        <h6>${Math.round(this.dashboardData.total_co2_saved / 0.022)} Trees</h6>
                        <small>Equivalent Trees Planted*</small>
                    </div>
                </div>
                <small class="text-muted">*Based on average CO₂ absorption of 22kg per tree per year</small>
            `;
        }
    }

    renderCategoryChart() {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        
        // Destroy existing chart
        if (this.charts.category) {
            this.charts.category.destroy();
        }

        // Group data by category
        const categoryData = {};
        this.dashboardData.habit_stats.forEach(stat => {
            if (!categoryData[stat.category]) {
                categoryData[stat.category] = 0;
            }
            categoryData[stat.category] += stat.total_co2_saved;
        });

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);
        const colors = ['#28a745', '#17a2b8', '#ffc107', '#fd7e14', '#dc3545'];

        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed.toFixed(1)} kg CO₂`;
                            }
                        }
                    }
                }
            }
        });
    }

    renderLeaderboardChart() {
        const ctx = document.getElementById('leaderboardChart').getContext('2d');
        
        // Destroy existing chart
        if (this.charts.leaderboard) {
            this.charts.leaderboard.destroy();
        }

        const topUsers = this.dashboardData.user_stats.slice(0, 5);
        const labels = topUsers.map(user => user.name);
        const data = topUsers.map(user => user.total_co2_saved || 0);

        this.charts.leaderboard = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'CO₂ Saved (kg)',
                    data: data,
                    backgroundColor: 'rgba(40, 167, 69, 0.8)',
                    borderColor: '#28a745',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1) + ' kg';
                            }
                        }
                    }
                }
            }
        });
    }

    renderRecentActivity() {
        const container = document.getElementById('recent-activity');
        
        if (this.dashboardData.user_stats.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h5>No activity yet</h5>
                    <p>Start logging actions to see collective impact!</p>
                </div>
            `;
            return;
        }

        // Get recent activity from all users (simplified - in real app, you'd have a separate endpoint)
        const recentUsers = this.dashboardData.user_stats.slice(0, 5);
        
        container.innerHTML = recentUsers.map(user => `
            <div class="d-flex justify-content-between align-items-center p-2 border-bottom">
                <div>
                    <strong>${user.name}</strong>
                    <span class="text-muted ms-2">${user.total_actions} actions</span>
                </div>
                <span class="badge bg-success">
                    <i class="fas fa-leaf me-1"></i>${(user.total_co2_saved || 0).toFixed(1)} kg
                </span>
            </div>
        `).join('');
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.style.display = 'none';
        });

        // Show selected section
        const section = document.getElementById(`${sectionName}-section`);
        if (section) {
            section.style.display = 'block';
            
            // Load data for specific sections
            if (sectionName === 'dashboard') {
                this.updateDashboard();
            } else if (sectionName === 'tracker') {
                this.loadMyLogs();
            }
        }
    }

    showSuccess(message) {
        document.getElementById('success-message').textContent = message;
        const modal = new bootstrap.Modal(document.getElementById('successModal'));
        modal.show();
    }

    showError(message) {
        // Create a simple but effective error display
        this.showNotification(message, 'danger');
    }

    showNotification(message, type = 'info') {
        // Remove any existing notifications first
        const existingNotifications = document.querySelectorAll('.custom-notification');
        existingNotifications.forEach(notif => notif.remove());
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} custom-notification`;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
            min-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            animation: slideInRight 0.3s ease-out;
        `;
        
        // Add icon based on type
        let icon = '';
        let bgColor = '';
        switch(type) {
            case 'danger': 
                icon = '<i class="fas fa-exclamation-triangle me-2" style="color: #dc3545;"></i>'; 
                bgColor = 'background-color: #f8d7da; border-color: #f5c6cb; color: #721c24;';
                break;
            case 'success': 
                icon = '<i class="fas fa-check-circle me-2" style="color: #28a745;"></i>'; 
                bgColor = 'background-color: #d4edda; border-color: #c3e6cb; color: #155724;';
                break;
            default: 
                icon = '<i class="fas fa-info-circle me-2" style="color: #17a2b8;"></i>';
                bgColor = 'background-color: #d1ecf1; border-color: #bee5eb; color: #0c5460;';
        }
        
        notification.style.cssText += bgColor;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    ${icon}${message}
                </div>
                <button type="button" onclick="this.parentElement.parentElement.remove()" style="
                    margin-left: 10px;
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 4px;
                    opacity: 0.7;
                    border-radius: 4px;
                ">&times;</button>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Auto remove after 6 seconds
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.remove();
            }
        }, 6000);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Validation Helper Functions
    isValidEmail(email) {
        // Simple email validation regex
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    }
    
    isFutureDate(dateString) {
        const selectedDate = new Date(dateString);
        const today = new Date();
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(today.getFullYear() + 1);
        
        return selectedDate > oneYearFromNow;
    }
    
    isPastDate(dateString) {
        const selectedDate = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        
        return selectedDate > today;
    }
    
    checkForDuplicateProfile(name, email) {
        // Check against loaded profiles for immediate feedback
        if (!this.allProfiles || this.allProfiles.length === 0) {
            return { isDuplicate: false };
        }
        
        const nameExists = this.allProfiles.find(profile => 
            profile.name.toLowerCase().trim() === name.toLowerCase().trim()
        );
        
        const emailExists = email && email.trim() !== '' ? 
            this.allProfiles.find(profile => 
                profile.email && profile.email.toLowerCase().trim() === email.toLowerCase().trim()
            ) : null;
        
        if (nameExists && emailExists && nameExists.id === emailExists.id) {
            return {
                isDuplicate: true,
                message: 'A profile with this name and email already exists. Please use different information.',
                focusField: 'name'
            };
        } else if (nameExists) {
            return {
                isDuplicate: true,
                message: `A profile with the name "${name}" already exists. Please choose a different name.`,
                focusField: 'name'
            };
        } else if (emailExists) {
            return {
                isDuplicate: true,
                message: `A profile with the email "${email}" already exists. Please use a different email address.`,
                focusField: 'email'
            };
        }
        
        return { isDuplicate: false };
    }

    // Local Storage Management Methods
    loadPreferences() {
        const defaultPreferences = {
            theme: 'light',
            defaultQuantity: 1,
            rememberFormData: true,
            showNotifications: true,
            autoSaveInterval: 30000, // 30 seconds
            lastActiveSection: 'welcome'
        };
        
        try {
            const saved = localStorage.getItem('co2challenge_preferences');
            return saved ? { ...defaultPreferences, ...JSON.parse(saved) } : defaultPreferences;
        } catch (error) {
            console.error('Error loading preferences:', error);
            return defaultPreferences;
        }
    }
    
    savePreferences() {
        try {
            localStorage.setItem('co2challenge_preferences', JSON.stringify(this.preferences));
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }
    
    saveFormData(formId, data) {
        if (!this.preferences.rememberFormData) return;
        
        try {
            const formData = this.getFormData() || {};
            formData[formId] = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem('co2challenge_form_data', JSON.stringify(formData));
        } catch (error) {
            console.error('Error saving form data:', error);
        }
    }
    
    getFormData(formId = null) {
        try {
            const saved = localStorage.getItem('co2challenge_form_data');
            if (!saved) return null;
            
            const allFormData = JSON.parse(saved);
            
            if (formId) {
                const formData = allFormData[formId];
                if (formData && (Date.now() - formData.timestamp) < 24 * 60 * 60 * 1000) { // 24 hours
                    return formData.data;
                }
                return null;
            }
            
            return allFormData;
        } catch (error) {
            console.error('Error getting form data:', error);
            return null;
        }
    }
    
    clearFormData(formId = null) {
        try {
            if (formId) {
                const allFormData = this.getFormData() || {};
                delete allFormData[formId];
                localStorage.setItem('co2challenge_form_data', JSON.stringify(allFormData));
            } else {
                localStorage.removeItem('co2challenge_form_data');
            }
        } catch (error) {
            console.error('Error clearing form data:', error);
        }
    }
    
    restoreFormData() {
        // Restore profile form data
        const profileData = this.getFormData('profile-form');
        if (profileData) {
            const nameField = document.getElementById('name');
            const emailField = document.getElementById('email');
            const internshipField = document.getElementById('internship-start');
            
            if (nameField && profileData.name) nameField.value = profileData.name;
            if (emailField && profileData.email) emailField.value = profileData.email;
            if (internshipField && profileData.internshipStart) internshipField.value = profileData.internshipStart;
        }
        
        // Restore log form data
        const logData = this.getFormData('log-form');
        if (logData) {
            const quantityField = document.getElementById('log-quantity');
            const notesField = document.getElementById('log-notes');
            
            if (quantityField && logData.quantity) quantityField.value = logData.quantity;
            if (notesField && logData.notes) notesField.value = logData.notes;
        }
    }

    // Profile Management Methods
    async loadAllProfiles() {
        try {
            const response = await fetch('/api/users');
            this.allProfiles = await response.json();
        } catch (error) {
            console.error('Error loading profiles:', error);
        }
    }

    updateCurrentUserDisplay() {
        const userNameElement = document.getElementById('current-user-name');
        if (this.currentUser && userNameElement) {
            userNameElement.textContent = this.currentUser.name;
        }
    }

    async switchToProfile(userId) {
        try {
            // Find the selected user in our profiles list
            const selectedUser = this.allProfiles.find(user => user.id == userId);
            if (!selectedUser) {
                throw new Error('Profile not found');
            }

            // Update current user
            this.currentUser = selectedUser;
            localStorage.setItem('co2challenge_user', JSON.stringify(this.currentUser));
            
            // Update display
            this.updateCurrentUserDisplay();
            
            // Load user's habits and data
            await this.loadUserHabits();
            
            // Refresh dashboard if currently visible
            if (document.getElementById('dashboard-section').style.display !== 'none') {
                this.updateDashboard();
            }
            
            // Refresh tracker logs if currently visible
            if (document.getElementById('tracker-section').style.display !== 'none') {
                this.loadMyLogs();
            }
            
            this.showSuccess(`Switched to profile: ${selectedUser.name}`);
            
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('profileSwitcherModal'));
            if (modal) modal.hide();
            
        } catch (error) {
            console.error('Error switching profile:', error);
            this.showError('Failed to switch profile. Please try again.');
        }
    }

    renderProfileList() {
        const container = document.getElementById('profile-list');
        
        if (this.allProfiles.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-users fa-2x mb-2"></i>
                    <p>No profiles found. Create a profile first.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.allProfiles.map(profile => `
            <div class="profile-item p-3 border rounded mb-2 ${profile.id === this.currentUser?.id ? 'bg-light border-primary' : 'bg-white'}" 
                 style="cursor: pointer;" 
                 onclick="window.co2Challenge.switchToProfile(${profile.id})">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">
                            <i class="fas fa-user me-2"></i>${profile.name}
                            ${profile.id === this.currentUser?.id ? '<span class="badge bg-primary ms-2">Current</span>' : ''}
                        </h6>
                        <small class="text-muted">
                            <i class="fas fa-envelope me-1"></i>${profile.email || 'No email'}
                        </small>
                        <br>
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>Started: ${this.formatDate(profile.internship_start_date)}
                        </small>
                    </div>
                    <div class="text-end">
                        <i class="fas fa-chevron-right text-muted"></i>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderCurrentProfileDetails() {
        const container = document.getElementById('current-profile-details');
        
        if (!this.currentUser) {
            container.innerHTML = '<p class="text-muted">No profile selected.</p>';
            return;
        }

        container.innerHTML = `
            <div class="profile-details">
                <div class="row mb-3">
                    <div class="col-4"><strong>Name:</strong></div>
                    <div class="col-8">${this.currentUser.name}</div>
                </div>
                <div class="row mb-3">
                    <div class="col-4"><strong>Email:</strong></div>
                    <div class="col-8">${this.currentUser.email || 'Not provided'}</div>
                </div>
                <div class="row mb-3">
                    <div class="col-4"><strong>Internship Start:</strong></div>
                    <div class="col-8">${this.formatDate(this.currentUser.internship_start_date)}</div>
                </div>
                <div class="row mb-3">
                    <div class="col-4"><strong>Profile ID:</strong></div>
                    <div class="col-8">#${this.currentUser.id}</div>
                </div>
                <div class="row mb-3">
                    <div class="col-4"><strong>Selected Habits:</strong></div>
                    <div class="col-8">${this.userHabits.length} habits selected</div>
                </div>
            </div>
        `;
    }
}

// Global functions for navigation
function showSection(sectionName) {
    if (window.co2Challenge) {
        window.co2Challenge.showSection(sectionName);
    }
}

// Global functions for profile management
function showProfileSwitcher() {
    console.log('showProfileSwitcher called');
    try {
        if (window.co2Challenge) {
            // Close dropdown first
            closeAllDropdowns();
            
            window.co2Challenge.loadAllProfiles().then(() => {
                window.co2Challenge.renderProfileList();
                const modal = new bootstrap.Modal(document.getElementById('profileSwitcherModal'));
                modal.show();
            }).catch(error => {
                console.error('Error in showProfileSwitcher:', error);
                alert('Error loading profiles. Please try again.');
            });
        } else {
            console.error('co2Challenge not initialized');
            alert('Application not ready. Please refresh the page.');
        }
    } catch (error) {
        console.error('Error in showProfileSwitcher:', error);
    }
}

function viewCurrentProfile() {
    console.log('viewCurrentProfile called');
    try {
        if (window.co2Challenge) {
            // Close dropdown first
            closeAllDropdowns();
            
            window.co2Challenge.renderCurrentProfileDetails();
            const modal = new bootstrap.Modal(document.getElementById('currentProfileModal'));
            modal.show();
        } else {
            console.error('co2Challenge not initialized');
            alert('Application not ready. Please refresh the page.');
        }
    } catch (error) {
        console.error('Error in viewCurrentProfile:', error);
    }
}

// Close all dropdowns
function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.remove('show');
    });
}

// Test function for debugging
function testProfileMenu() {
    console.log('Testing profile menu...');
    console.log('co2Challenge available:', !!window.co2Challenge);
    console.log('Bootstrap available:', !!window.bootstrap);
    
    const dropdown = document.getElementById('profileDropdown');
    const menu = document.querySelector('.dropdown-menu');
    
    console.log('Dropdown element:', dropdown);
    console.log('Menu element:', menu);
    
    if (menu) {
        menu.classList.toggle('show');
        console.log('Toggled dropdown menu');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.co2Challenge = new CO2Challenge();
        console.log('CO2Challenge initialized successfully');
        
        // Check if user has existing profiles and auto-redirect to dashboard
        setTimeout(() => {
            checkForExistingProfiles();
        }, 500); // Small delay to ensure everything is loaded
        
    } catch (error) {
        console.error('Error initializing CO2Challenge:', error);
        // Show a simple alert if there's an initialization error
        alert('There was an error loading the application. Please refresh the page.');
    }
});

// Check for existing profiles and redirect to dashboard if found
function checkForExistingProfiles() {
    try {
        // Check if there are any profiles stored
        const profiles = JSON.parse(localStorage.getItem('profiles') || '[]');
        const currentProfileId = localStorage.getItem('currentProfileId');
        
        console.log('Profiles found:', profiles.length);
        console.log('Current profile ID:', currentProfileId);
        
        // If there are profiles and a current profile is set, go to dashboard
        if (profiles.length > 0 && currentProfileId) {
            console.log('Existing profiles found, redirecting to dashboard...');
            showSection('dashboard');
            
            // Update the current profile display if available
            const currentProfile = profiles.find(p => p.id === currentProfileId);
            if (currentProfile) {
                const currentUserName = document.getElementById('current-user-name');
                if (currentUserName) {
                    currentUserName.textContent = currentProfile.name;
                }
                console.log('Active profile:', currentProfile.name);
            }
        } else {
            console.log('No existing profiles found, showing welcome page');
            // Stay on welcome page
        }
    } catch (error) {
        console.error('Error checking for existing profiles:', error);
        // If there's an error, just stay on welcome page
    }
}
