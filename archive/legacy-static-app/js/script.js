document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const modal = document.getElementById('disclaimer-modal');
    const agreeBtn = document.getElementById('agree-btn');
    const allergenOptions = document.querySelectorAll('.allergen-option');
    const submitBtn = document.getElementById('submit-btn');

    // 1. Show Disclaimer on Load
    // In a real app, check localStorage if user already agreed
    setTimeout(() => {
        modal.classList.add('active');
    }, 500); // Small delay for smooth entrance

    // 2. Handle Agree
    agreeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    // 3. Handle Allergen Selection
    allergenOptions.forEach(option => {
        option.addEventListener('click', () => {
            option.classList.toggle('selected');

            // Optional: Haptic feedback or animation trigger
        });
    });

    // 4. Handle Submit
    submitBtn.addEventListener('click', () => {
        // Collect selected allergens
        const selected = [];
        document.querySelectorAll('.allergen-option.selected').forEach(el => {
            selected.push(el.dataset.allerge);
        });

        const customAllergy = document.getElementById('custom-allergy').value;
        if (customAllergy) {
            selected.push(`Custom: ${customAllergy}`);
        }

        if (selected.length === 0) {
            alert("No allergens selected! Please select at least one or type a custom one if you have specific needs.");
            return;
        }

        // Demo Action
        console.log('Submitted Allergens:', selected);
        alert(`We will filter the menu for: \n- ${selected.join('\n- ')}`);

        // Reset or redirect
    });
});
