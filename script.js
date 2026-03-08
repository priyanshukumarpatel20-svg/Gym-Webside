document.addEventListener('DOMContentLoaded', function () {

    console.log('Script loaded, initializing...');

    // Feedback form and star rating
    const feedbackForm = document.getElementById('feedbackForm');
    const feedbackNameInput = document.getElementById('feedbackName');
    const feedbackEmailInput = document.getElementById('feedbackEmail');
    const feedbackMessageInput = document.getElementById('feedbackMessage');
    const feedbackRatingStars = document.querySelectorAll('#feedbackRatingStars button');
    const feedbackList = document.getElementById('feedbackList');
    const averageRatingValue = document.getElementById('averageRatingValue');
    const averageRatingCount = document.getElementById('averageRatingCount');

    // State variables
    let selectedRating = 0;
    let feedbackEntries = [];
    let showAllFeedback = false;
    let sortMode = 'latest';
    const MAX_FEEDBACK_VISIBLE = 4;

    // Check if Firebase is properly configured
    let firebaseReady = false;
    let reviewsCollection = null;

    function initFirebase() {
        try {
            const database = window.db;
            if (typeof firebase !== 'undefined' && database) {
                reviewsCollection = database.collection('reviews');
                firebaseReady = true;
                console.log('Firebase connected successfully');
                return true;
            }
        } catch (e) {
            console.warn('Firebase not configured:', e.message);
        }
        console.log('Using localStorage fallback');
        return false;
    }

    function setRating(rating) {
        selectedRating = rating;
        feedbackRatingStars.forEach(star => {
            const value = Number(star.dataset.value);
            star.classList.toggle('active', value <= rating);
        });
    }

    function renderAverageRating() {
        if (!feedbackEntries.length) {
            averageRatingValue.textContent = '0.0';
            averageRatingCount.textContent = 'No reviews yet';
            return;
        }

        const total = feedbackEntries.reduce((s, i) => s + i.rating, 0);
        averageRatingValue.textContent = (total / feedbackEntries.length).toFixed(1);
        averageRatingCount.textContent = `Based on ${feedbackEntries.length} reviews`;
    }

    function getSortedFeedbacks() {
        const copy = [...feedbackEntries];

        if (sortMode === 'rating') {
            return copy.sort((a, b) => b.rating - a.rating);
        }

        return copy.sort((a, b) => {
            const timeA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : 0;
            const timeB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : 0;
            return timeB - timeA;
        });
    }

    function renderFeedbackList() {
        feedbackList.innerHTML = '';

        if (!feedbackEntries.length) {
            feedbackList.innerHTML = '<p class="feedback-empty">No feedback yet. Be the first to share your experience!</p>';
            return;
        }

        const sorted = getSortedFeedbacks();
        const visible = showAllFeedback ? sorted : sorted.slice(0, MAX_FEEDBACK_VISIBLE);

        visible.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'feedback-item';
            
            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                starsHtml += '<span class="star' + (i <= entry.rating ? ' filled' : '') + '">★</span>';
            }
            
            div.innerHTML = 
                '<div class="feedback-item-header">' +
                    '<p class="feedback-item-name">' + entry.name + '</p>' +
                    '<p class="feedback-item-email">' + entry.email + '</p>' +
                '</div>' +
                '<div class="feedback-item-stars">' + starsHtml + '</div>' +
                '<p class="feedback-item-message">' + entry.message + '</p>';
            feedbackList.appendChild(div);
        });

        if (sorted.length > MAX_FEEDBACK_VISIBLE) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'btn btn-outline';
            toggleBtn.style.marginTop = '10px';
            toggleBtn.textContent = showAllFeedback ? 'Show Less' : 'More';
            toggleBtn.addEventListener('click', function() {
                showAllFeedback = !showAllFeedback;
                renderFeedbackList();
            });
            feedbackList.appendChild(toggleBtn);
        }
    }

    // Star click handler
    feedbackRatingStars.forEach(function(star) {
        star.addEventListener('click', function() {
            setRating(Number(star.dataset.value));
        });
    });

    function loadFromLocalStorage() {
        try {
            var stored = localStorage.getItem('gymFeedbacks');
            feedbackEntries = stored ? JSON.parse(stored) : [];
        } catch(e) {
            feedbackEntries = [];
        }
        renderAverageRating();
        renderFeedbackList();
    }

    function loadReviews() {
        feedbackList.innerHTML = '<p class="feedback-empty">Loading reviews...</p>';
        
        if (firebaseReady && reviewsCollection) {
            reviewsCollection.get()
                .then(function(snapshot) {
                    feedbackEntries = [];
                    snapshot.forEach(function(doc) {
                        feedbackEntries.push({ id: doc.id, data: doc.data() });
                    });
                    renderAverageRating();
                    renderFeedbackList();
                })
                .catch(function(error) {
                    console.error('Firebase error:', error);
                    loadFromLocalStorage();
                });
        } else {
            loadFromLocalStorage();
        }
    }

    function saveToLocalStorage() {
        try {
            localStorage.setItem('gymFeedbacks', JSON.stringify(feedbackEntries));
        } catch(e) {
            console.error('LocalStorage error:', e);
        }
    }

    // Initialize
    initFirebase();
    loadReviews();

    // Form submit handler - direct inline handler
    if (feedbackForm) {
        feedbackForm.onsubmit = function(e) {
            e.preventDefault();
            console.log('Form submitted');

            if (!selectedRating) {
                alert('Please select a rating');
                return false;
            }

            var newReview = {
                name: feedbackNameInput.value,
                email: feedbackEmailInput.value,
                message: feedbackMessageInput.value,
                rating: selectedRating,
                timestamp: Date.now()
            };

            console.log('New review:', newReview);

            // Add to local array
            feedbackEntries.push(newReview);
            saveToLocalStorage();

            // Reset form
            feedbackForm.reset();
            setRating(0);
            showAllFeedback = false;
            
            // Reload the list
            loadReviews();
            
            alert('Thank you for your feedback! Your review has been submitted.');
            
            return false;
        };
    } else {
        console.error('Feedback form not found!');
    }

    console.log('Initialization complete');
});
