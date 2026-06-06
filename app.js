document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // Navigation & Scroll Effects
    // ==========================================================================
    const header = document.getElementById('site-header');
    const menuToggle = document.getElementById('menu-toggle-btn');
    const navMenu = document.getElementById('navigation-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Toggle Mobile Menu
    menuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        const isExpanded = navMenu.classList.contains('active');
        menuToggle.querySelector('span').textContent = isExpanded ? 'close' : 'menu';
    });

    // Close Mobile Menu on Link Click
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            menuToggle.querySelector('span').textContent = 'menu';
        });
    });

    // Header Scroll Effect (Add blur and border when scrolled)
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // ==========================================================================
    // Reviews Filtering & Pagination Logic
    // ==========================================================================
    const reviewsGrid = document.getElementById('reviews-display-grid');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const loadMoreBtn = document.getElementById('load-more-reviews-btn');

    let currentFilter = 'all';
    let reviewsToShow = 6;
    const incrementReviews = 6;

    // Filter Reviews Data
    function getFilteredReviews() {
        if (!window.reviewsData) return [];
        
        return window.reviewsData.filter(review => {
            if (currentFilter === '5stars') {
                return review.rating === 5;
            } else if (currentFilter === 'photos') {
                return review.photos_urls && review.photos_urls.length > 0;
            }
            return true; // 'all'
        });
    }

    // Render Review Cards
    function renderReviews() {
        const filtered = getFilteredReviews();
        reviewsGrid.style.opacity = '0';
        
        setTimeout(() => {
            reviewsGrid.innerHTML = '';
            
            const slice = filtered.slice(0, reviewsToShow);
            
            if (slice.length === 0) {
                reviewsGrid.innerHTML = `
                    <div class="no-reviews-msg" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                        <span class="material-symbols-outlined" style="font-size: 3rem; color: var(--accent-gold); margin-bottom: 1rem;">sentiment_neutral</span>
                        <p>No reviews found matching the selected filter.</p>
                    </div>
                `;
                loadMoreBtn.style.display = 'none';
                reviewsGrid.style.opacity = '1';
                return;
            }

            slice.forEach(review => {
                const card = document.createElement('div');
                card.className = 'review-card';
                card.id = `review-card-${review.id}`;
                
                // Author First Initial
                const initial = review.author ? review.author.charAt(0).toUpperCase() : 'A';
                
                // Stars HTML
                let starsHtml = '';
                const ratingCount = review.rating || 5;
                for (let s = 0; s < 5; s++) {
                    starsHtml += `<span class="material-symbols-outlined">${s < ratingCount ? 'star' : 'star_outline'}</span>`;
                }

                // Long review body limit
                const isLongText = review.text.length > 220;
                const displayText = isLongText ? review.text.slice(0, 220) + '...' : review.text;
                
                // Photos HTML
                let photosHtml = '';
                if (review.local_photos && review.local_photos.length > 0) {
                    photosHtml = '<div class="review-photos">';
                    review.local_photos.forEach((photoPath, idx) => {
                        // The local path is downloaded_photos/filename.jpg. We can use it directly
                        photosHtml += `
                            <button class="review-photo-btn" 
                                    style="background-image: url('${photoPath}')" 
                                    data-photo-url="${photoPath}"
                                    data-author="${review.author || 'Guest'}"
                                    aria-label="View photo ${idx + 1} from ${review.author}'s review"></button>
                        `;
                    });
                    photosHtml += '</div>';
                }

                card.innerHTML = `
                    <div>
                        <div class="review-meta">
                            <div class="stars" aria-label="${ratingCount} out of 5 stars">${starsHtml}</div>
                            <span class="review-date">${review.date || 'Review'}</span>
                        </div>
                        <div class="review-body">
                            <p class="review-text" data-fulltext="${encodeURIComponent(review.text)}">${displayText}</p>
                            ${isLongText ? `<button class="review-expand-btn" data-expanded="false" id="expand-btn-${review.id}">Read More</button>` : ''}
                        </div>
                    </div>
                    <div>
                        ${photosHtml}
                        <div class="review-author">
                            <div class="author-avatar">${initial}</div>
                            <span class="author-name">${review.author || 'Anonymous'}</span>
                        </div>
                    </div>
                `;

                reviewsGrid.appendChild(card);
            });

            // Toggle Load More Button Visibility
            if (reviewsToShow >= filtered.length) {
                loadMoreBtn.style.display = 'none';
            } else {
                loadMoreBtn.style.display = 'inline-block';
            }
            
            reviewsGrid.style.opacity = '1';
            setupReviewInteractions();
        }, 150);
    }

    // Set up Expand buttons and Lightbox triggers for newly rendered cards
    function setupReviewInteractions() {
        // Expand/Collapse text
        document.querySelectorAll('.review-expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const textEl = e.target.previousElementSibling;
                const fullText = decodeURIComponent(textEl.dataset.fulltext);
                const isExpanded = e.target.dataset.expanded === 'true';

                if (isExpanded) {
                    textEl.textContent = fullText.slice(0, 220) + '...';
                    e.target.textContent = 'Read More';
                    e.target.dataset.expanded = 'false';
                } else {
                    textEl.textContent = fullText;
                    e.target.textContent = 'Read Less';
                    e.target.dataset.expanded = 'true';
                }
            });
        });

        // Photo Click Lightbox
        document.querySelectorAll('.review-photo-btn').forEach(photoBtn => {
            photoBtn.addEventListener('click', (e) => {
                const photoUrl = e.currentTarget.dataset.photoUrl;
                const author = e.currentTarget.dataset.author;
                openLightbox(photoUrl, author);
            });
        });
    }

    // Handle Filter Clicks
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            currentFilter = e.target.dataset.filter;
            reviewsToShow = 6; // reset pagination count
            renderReviews();
        });
    });

    // Handle Load More
    loadMoreBtn.addEventListener('click', () => {
        reviewsToShow += incrementReviews;
        renderReviews();
    });

    // Initialize Reviews
    renderReviews();

    // ==========================================================================
    // Lightbox Functionality
    // ==========================================================================
    const lightbox = document.getElementById('photo-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxClose = document.getElementById('lightbox-close-btn');

    function openLightbox(url, author) {
        lightboxImg.src = url;
        lightboxCaption.textContent = `Review photo shared by ${author}`;
        lightbox.classList.add('active');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // Disable page scrolling
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = 'auto'; // Enable page scrolling
        // Clear src after fadeout to prevent image flicker next time
        setTimeout(() => { lightboxImg.src = ''; }, 300);
    }

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Close lightbox on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            closeLightbox();
        }
    });

    // ==========================================================================
    // WhatsApp Inquiry Redirection
    // ==========================================================================
    const inquiryForm = document.getElementById('tattoo-inquiry-form');

    inquiryForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get Form Values
        const name = document.getElementById('form-name').value.strip ? document.getElementById('form-name').value.strip() : document.getElementById('form-name').value;
        const phone = document.getElementById('form-phone').value;
        const technique = document.getElementById('form-technique').value;
        const size = document.getElementById('form-size').value;
        const placement = document.getElementById('form-placement').value;
        const description = document.getElementById('form-description').value;

        // Construct structured text template
        const intro = `Hello Ceylon Art Ink! I would like to make an inquiry for a tattoo / piercing session. Here are my details:`;
        const details = `*Name:* ${name}\n*WhatsApp Contact:* ${phone}\n*Preferred Style:* ${technique}\n*Approx. Size:* ${size}\n*Placement on Body:* ${placement}\n*Description:* ${description}`;
        const encodedText = encodeURIComponent(`${intro}\n\n${details}`);

        // Target WhatsApp Link (Sri Lanka international prefix 94)
        // Local number: 0774400877 becomes 94774400877
        const whatsappUrl = `https://wa.me/94774400877?text=${encodedText}`;

        // Redirect user to WhatsApp in a new tab
        window.open(whatsappUrl, '_blank');

        // Reset form
        inquiryForm.reset();
    });
});
