document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('riskForm');
    const submitBtn = document.getElementById('submitBtn');
    const errorNote = document.getElementById('errorNote');
    const verdictSection = document.getElementById('verdict');
    
    // Inputs for auto-calculating percentage
    const incomeInput = document.getElementById('person_income');
    const loanAmntInput = document.getElementById('loan_amnt');
    const percentInput = document.getElementById('loan_percent_income');

    // API Status elements
    const apiDot = document.getElementById('apiDot');
    const apiStatusText = document.getElementById('apiStatusText');

    // Check API Health on load
    async function checkApiStatus() {
        try {
            const response = await fetch('/', { method: 'HEAD' });
            if (response.ok) {
                apiDot.style.backgroundColor = '#2e7d32'; // Green
                apiStatusText.textContent = 'service online';
            } else {
                throw new Error();
            }
        } catch (err) {
            apiDot.style.backgroundColor = '#c62828'; // Red
            apiStatusText.textContent = 'service offline';
        }
    }
    checkApiStatus();

    // Auto-calculate Loan as % of Income
    function updatePercentage() {
        const income = parseFloat(incomeInput.value) || 0;
        const amount = parseFloat(loanAmntInput.value) || 0;
        if (income > 0) {
            const ratio = (amount / income).toFixed(2);
            percentInput.value = Math.min(Math.max(ratio, 0), 1); // Keep between 0 and 1
        }
    }

    incomeInput.addEventListener('input', updatePercentage);
    loanAmntInput.addEventListener('input', updatePercentage);

    // Handle Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorNote.hidden = true;
        submitBtn.classList.add('is-loading');

        // Gather form data matching Pydantic model
        const payload = {
            person_age: parseInt(document.getElementById('person_age').value),
            person_income: parseFloat(incomeInput.value),
            person_home_ownership: document.getElementById('person_home_ownership').value,
            person_emp_length: parseFloat(document.getElementById('person_emp_length').value),
            loan_intent: document.getElementById('loan_intent').value,
            loan_grade: document.getElementById('loan_grade').value,
            loan_amnt: parseFloat(loanAmntInput.value),
            loan_int_rate: parseFloat(document.getElementById('loan_int_rate').value),
            loan_percent_income: parseFloat(percentInput.value),
            cb_person_default_on_file: document.getElementById('cb_person_default_on_file').value,
            cb_person_cred_hist_length: parseInt(document.getElementById('cb_person_cred_hist_length').value)
        };

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error("Server validation error details:", errData);
                throw new Error('Server error during prediction assessment.');
            }

            const result = await response.json();
            displayVerdict(result);

        } catch (err) {
            console.error("Prediction Request Failed:", err);
            errorNote.textContent = 'Failed to connect to underwriting API. Check Browser Console (F12) for details.';
            errorNote.hidden = false;
        } finally {
            submitBtn.classList.remove('is-loading');
        }
    });

    function displayVerdict(data) {
        verdictSection.hidden = false;
        verdictSection.scrollIntoView({ behavior: 'smooth' });

        const prob = data.default_probability; // value between 0 and 1
        const probPercent = (prob * 100).toFixed(1);
        const isHighRisk = data.default_prediction === 1;

        // Update Text Readouts
        document.getElementById('probNumber').textContent = probPercent;
        document.getElementById('factProb').textContent = `${probPercent}%`;
        document.getElementById('factThreshold').textContent = '50.0%'; // Standard threshold benchmark
        
        const resultEl = document.getElementById('factResult');
        resultEl.textContent = data.Result;
        resultEl.style.color = isHighRisk ? '#c62828' : '#2e7d32';

        // Update Stamp Badge
        const stampBadge = document.getElementById('stampBadge');
        const stampText = document.getElementById('stampText');
        stampText.textContent = data.Result.toUpperCase();
        
        if (isHighRisk) {
            stampBadge.classList.add('stamp--risk');
            stampBadge.classList.remove('stamp--safe');
        } else {
            stampBadge.classList.add('stamp--safe');
            stampBadge.classList.remove('stamp--risk');
        }

        // Animate Gauge Circle (Circumference for r=86 is ~540.35)
        const circumference = 2 * Math.PI * 86;
        const gaugeFill = document.getElementById('gaugeFill');
        
        // Set stroke dasharray & offset based on probability
        gaugeFill.style.strokeDasharray = circumference;
        const offset = circumference - (prob * circumference);
        gaugeFill.style.strokeDashoffset = offset;
        
        // Change gauge color based on risk
        gaugeFill.style.stroke = isHighRisk ? '#c62828' : '#1b5e20';
    }
});