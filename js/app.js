// Backgammon Checker and Dice Detection Demo Application

let videoElement = null;
let canvasOutput = null;
let statusText = null;
let startButton = null;
let stopButton = null;
let switchCameraButton = null;
let loadingIndicator = null;
let stream = null;
let opencvReady = false;
let isProcessing = false;
let processingInterval = null;
let currentFacingMode = 'user'; // 'user' for front camera, 'environment' for back camera
const FPS = 5; // Detection frequency

// Check if device is mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('App.js loaded');
    
    // Get DOM elements
    videoElement = document.getElementById('videoElement');
    canvasOutput = document.getElementById('canvasOutput');
    statusText = document.getElementById('statusText');
    startButton = document.getElementById('startButton');
    stopButton = document.getElementById('stopButton');
    switchCameraButton = document.getElementById('switchCameraButton');
    loadingIndicator = document.getElementById('loadingIndicator');
    
    // Add event listeners
    startButton.addEventListener('click', startCamera);
    stopButton.addEventListener('click', stopCamera);
    switchCameraButton.addEventListener('click', switchCamera);
    
    // Show loading indicator while OpenCV loads
    loadingIndicator.style.display = 'block';
    
    updateStatus('Waiting for OpenCV.js to load...');
});

// Wait for OpenCV to be ready
function onOpenCvReady() {
    console.log('OpenCV.js is ready');
    opencvReady = true;
    loadingIndicator.style.display = 'none';
    updateStatus('OpenCV.js loaded. Click "Start Camera" to begin');
}

// Check if OpenCV is loaded
var Module = {
    onRuntimeInitialized: function() {
        onOpenCvReady();
    }
};

// Start camera function
async function startCamera() {
    try {
        updateStatus('Requesting camera access...');
        
        // Request camera access with constraints optimized for mobile
        const constraints = {
            video: {
                width: { ideal: isMobile ? 1280 : 640 },
                height: { ideal: isMobile ? 720 : 480 },
                facingMode: currentFacingMode,
                frameRate: { ideal: 30 }
            },
            audio: false
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Set video source
        videoElement.srcObject = stream;
        
        // Wait for video to be ready
        videoElement.onloadedmetadata = () => {
            videoElement.play();
            
            // Set canvas dimensions to match video
            canvasOutput.width = videoElement.videoWidth;
            canvasOutput.height = videoElement.videoHeight;
            canvasOutput.style.display = 'block';
            
            updateStatus('Camera active - Processing started');
            startButton.disabled = true;
            stopButton.disabled = false;
            
            // Show camera switch button on mobile devices with multiple cameras
            if (isMobile) {
                switchCameraButton.style.display = 'block';
            }
            
            console.log('Camera started successfully');
            
            // Start processing if OpenCV is ready
            if (opencvReady) {
                startProcessing();
            }
        };
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        let errorMessage = 'Failed to access camera';
        
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Camera access denied. Please allow camera permissions.';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'No camera found on this device.';
        } else if (error.name === 'NotReadableError') {
            errorMessage = 'Camera is already in use by another application.';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage = 'Camera constraints could not be satisfied. Trying with different settings.';
            // Try with more permissive constraints
            return startCameraWithFallback();
        }
        
        updateStatus(errorMessage);
    }
}

// Fallback camera function with more permissive constraints
async function startCameraWithFallback() {
    try {
        const fallbackConstraints = {
            video: {
                facingMode: currentFacingMode
            },
            audio: false
        };
        
        stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        videoElement.srcObject = stream;
        
        videoElement.onloadedmetadata = () => {
            videoElement.play();
            canvasOutput.width = videoElement.videoWidth;
            canvasOutput.height = videoElement.videoHeight;
            canvasOutput.style.display = 'block';
            
            updateStatus('Camera active - Processing started');
            startButton.disabled = true;
            stopButton.disabled = false;
            
            if (isMobile) {
                switchCameraButton.style.display = 'block';
            }
            
            if (opencvReady) {
                startProcessing();
            }
        };
        
    } catch (error) {
        console.error('Error with fallback camera access:', error);
        updateStatus('Unable to access camera on this device.');
    }
}

// Switch between front and back cameras (mobile only)
async function switchCamera() {
    if (!stream) return;
    
    // Stop current stream
    stream.getTracks().forEach(track => track.stop());
    
    // Toggle camera facing mode
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    
    // Update video element transform based on camera
    videoElement.style.transform = currentFacingMode === 'user' ? 'rotateY(180deg)' : 'none';
    
    // Restart camera with new facing mode
    await startCamera();
}

// Stop camera function
function stopCamera() {
    // Stop processing
    stopProcessing();
    
    if (stream) {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        
        // Clear video source
        videoElement.srcObject = null;
        
        // Hide canvas
        canvasOutput.style.display = 'none';
        
        // Hide camera switch button
        switchCameraButton.style.display = 'none';
        
        updateStatus('Camera stopped. Click "Start Camera" to begin');
        startButton.disabled = false;
        stopButton.disabled = true;
        console.log('Camera stopped');
    }
}

// Update status text
function updateStatus(message) {
    if (statusText) {
        statusText.textContent = message;
    }
    console.log('Status:', message);
}

// Start processing video frames
function startProcessing() {
    if (isProcessing) return;
    
    isProcessing = true;
    const interval = 1000 / FPS; // Convert FPS to milliseconds
    
    processingInterval = setInterval(() => {
        if (videoElement && videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
            processVideo();
        }
    }, interval);
    
    console.log(`Started processing at ${FPS} FPS`);
}

// Stop processing video frames
function stopProcessing() {
    if (processingInterval) {
        clearInterval(processingInterval);
        processingInterval = null;
        isProcessing = false;
        console.log('Stopped processing');
    }
}

// Process video frame with OpenCV - detects both checkers (circles) and dice (squares with dots)
function processVideo() {
    if (!opencvReady || !videoElement || !canvasOutput) return;
    
    try {
        const ctx = canvasOutput.getContext('2d');
        
        // Draw current video frame to canvas
        ctx.drawImage(videoElement, 0, 0, canvasOutput.width, canvasOutput.height);
        
        // Read the image from canvas
        let src = cv.imread(canvasOutput);
        let gray = new cv.Mat();
        let blurred = new cv.Mat();
        let edges = new cv.Mat();
        let circles = new cv.Mat();
        
        // Convert to grayscale
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        
        // Apply Gaussian blur to reduce noise
        cv.GaussianBlur(gray, blurred, new cv.Size(9, 9), 2, 2);
        
        // DETECT CHECKERS (CIRCLES)
        cv.HoughCircles(
            blurred,
            circles,
            cv.HOUGH_GRADIENT,
            1,              // dp: inverse ratio of accumulator resolution
            gray.rows / 8,  // minDist: minimum distance between centers
            100,            // param1: higher threshold for Canny edge detector
            30,             // param2: accumulator threshold (lower = more false circles)
            10,             // minRadius
            100             // maxRadius
        );
        
        // DETECT DICE (SQUARES/RECTANGLES)
        // Use Canny edge detection
        cv.Canny(blurred, edges, 50, 150, 3, false);
        
        // Find contours
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
        
        // Draw the original frame first
        ctx.drawImage(videoElement, 0, 0, canvasOutput.width, canvasOutput.height);
        
        const numCircles = circles.cols;
        const numContours = contours.size();
        
        console.log(`Detected circles: ${numCircles}, contours: ${numContours}`);
        
        // Draw detected checker circles
        for (let i = 0; i < numCircles; i++) {
            let x = circles.data32F[i * 3];
            let y = circles.data32F[i * 3 + 1];
            let radius = circles.data32F[i * 3 + 2];
            
            // Draw circle
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#00ff00'; // Green circle for checkers
            ctx.stroke();
            
            // Draw center point
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = '#ff0000'; // Red center
            ctx.fill();
            
            // Label as checker
            ctx.fillStyle = '#00ff00';
            ctx.font = '16px Arial';
            ctx.fillText('Checker', x - 25, y - radius - 10);
        }
        
        // Process contours to find dice (square/rectangular shapes)
        let diceCount = 0;
        let diceNumbers = [];
        
        for (let i = 0; i < numContours; i++) {
            let contour = contours.get(i);
            let area = cv.contourArea(contour);
            
            // Filter by area to avoid small noise
            if (area < 1000) continue;
            
            let perimeter = cv.arcLength(contour, true);
            let approx = new cv.Mat();
            cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);
            
            // Check if it's a quadrilateral (4 corners - square/rectangle)
            if (approx.rows === 4) {
                let vertices = [];
                for (let j = 0; j < 4; j++) {
                    vertices.push({
                        x: approx.data32S[j * 2],
                        y: approx.data32S[j * 2 + 1]
                    });
                }
                
                // Calculate aspect ratio to distinguish squares/rectangles from other shapes
                let width = Math.sqrt(Math.pow(vertices[1].x - vertices[0].x, 2) + Math.pow(vertices[1].y - vertices[0].y, 2));
                let height = Math.sqrt(Math.pow(vertices[2].x - vertices[1].x, 2) + Math.pow(vertices[2].y - vertices[1].y, 2));
                let aspectRatio = width / height;
                
                // Dice are typically close to square (aspect ratio ~1)
                if (aspectRatio > 0.7 && aspectRatio < 1.3) {
                    diceCount++;
                    
                    // Draw bounding rectangle for dice
                    ctx.beginPath();
                    ctx.moveTo(vertices[0].x, vertices[0].y);
                    for (let j = 1; j < 4; j++) {
                        ctx.lineTo(vertices[j].x, vertices[j].y);
                    }
                    ctx.closePath();
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = '#ff00ff'; // Magenta for dice
                    ctx.stroke();
                    
                    // Calculate center for labeling
                    let centerX = (vertices[0].x + vertices[1].x + vertices[2].x + vertices[3].x) / 4;
                    let centerY = (vertices[0].y + vertices[1].y + vertices[2].y + vertices[3].y) / 4;
                    
                    // Detect dice number
                    let diceNumber = detectDiceNumber(ctx, src, vertices, centerX, centerY);
                    diceNumbers.push(diceNumber);
                    
                    // Label as dice with number
                    ctx.fillStyle = '#ff00ff';
                    ctx.font = '16px Arial';
                    ctx.fillText(`Dice: ${diceNumber}`, centerX - 25, centerY);
                }
            }
            approx.delete();
        }
        
        // Update status with detection results
        if (numCircles > 0 || diceCount > 0) {
            let diceInfo = diceNumbers.length > 0 ? `Dice numbers: ${diceNumbers.join(', ')}` : '';
            updateStatus(`Detected: ${numCircles} checkers, ${diceCount} dice. ${diceInfo}`);
        }
        
        // Clean up
        src.delete();
        gray.delete();
        blurred.delete();
        edges.delete();
        circles.delete();
        contours.delete();
        hierarchy.delete();
        
    } catch (error) {
        console.error('Error processing video:', error);
    }
}

// Detect dice number by analyzing pip patterns (excluding corners)
function detectDiceNumber(ctx, src, vertices, centerX, centerY) {
    try {
        // Create a mask for the dice region
        let diceRoi = new cv.Mat();
        let mask = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
        
        // Create contour for masking
        let contour = cv.matFromArray(4, 1, cv.CV_32SC2, [
            vertices[0].x, vertices[0].y,
            vertices[1].x, vertices[1].y,
            vertices[2].x, vertices[2].y,
            vertices[3].x, vertices[3].y
        ]);
        
        let color = new cv.Scalar(255);
        cv.fillConvexPoly(mask, contour, color);
        
        // Apply mask to get dice region
        src.copyTo(diceRoi, mask);
        
        // Convert to grayscale for pip detection
        let grayRoi = new cv.Mat();
        cv.cvtColor(diceRoi, grayRoi, cv.COLOR_RGBA2GRAY);
        
        // Apply Gaussian blur to reduce noise
        let blurredRoi = new cv.Mat();
        cv.GaussianBlur(grayRoi, blurredRoi, new cv.Size(5, 5), 1.5);
        
        // Use HoughCircles to detect pips (they should be circular)
        let pipCircles = new cv.Mat();
        cv.HoughCircles(
            blurredRoi,
            pipCircles,
            cv.HOUGH_GRADIENT,
            1,                      // dp
            blurredRoi.rows / 10,   // minDist between pip centers
            100,                    // param1
            25,                     // param2 (lower = more sensitive)
            5,                      // minRadius of pips
            25                      // maxRadius of pips
        );
        
        let pips = [];
        let pipCount = pipCircles.cols;
        
        // Calculate dice bounding box to exclude corners
        let minX = Math.min(vertices[0].x, vertices[1].x, vertices[2].x, vertices[3].x);
        let maxX = Math.max(vertices[0].x, vertices[1].x, vertices[2].x, vertices[3].x);
        let minY = Math.min(vertices[0].y, vertices[1].y, vertices[2].y, vertices[3].y);
        let maxY = Math.max(vertices[0].y, vertices[1].y, vertices[2].y, vertices[3].y);
        
        // Define safe zone (exclude outer 25% to avoid corners)
        let safeMarginX = (maxX - minX) * 0.25;
        let safeMarginY = (maxY - minY) * 0.25;
        let safeMinX = minX + safeMarginX;
        let safeMaxX = maxX - safeMarginX;
        let safeMinY = minY + safeMarginY;
        let safeMaxY = maxY - safeMarginY;
        
        // Process detected pip circles
        for (let i = 0; i < pipCount; i++) {
            let x = pipCircles.data32F[i * 3];
            let y = pipCircles.data32F[i * 3 + 1];
            let radius = pipCircles.data32F[i * 3 + 2];
            
            // Only count pips that are within the safe zone (not near corners/edges)
            if (x >= safeMinX && x <= safeMaxX && y >= safeMinY && y <= safeMaxY) {
                pips.push({
                    x: x,
                    y: y,
                    radius: radius
                });
                
                // Draw detected pip
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, 2 * Math.PI);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#ffff00';
                ctx.stroke();
                
                // Draw pip center
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, 2 * Math.PI);
                ctx.fillStyle = '#ffff00';
                ctx.fill();
            }
        }
        
        // If no pips detected with HoughCircles, try contour-based detection
        if (pips.length === 0) {
            pips = detectPipsUsingContours(blurredRoi, ctx, safeMinX, safeMinY, safeMaxX, safeMaxY, vertices);
        }
        
        // Determine dice number based on pip count
        let diceNumber = pips.length;
        
        // Validate dice number (should be 1-6 for standard dice)
        if (diceNumber < 1 || diceNumber > 6) {
            diceNumber = 0; // Invalid detection
        }
        
        // Display results
        ctx.fillStyle = '#ffff00';
        ctx.font = '14px Arial';
        ctx.fillText(`Value: ${diceNumber}`, centerX - 20, centerY + 20);
        
        // Clean up
        diceRoi.delete();
        mask.delete();
        contour.delete();
        grayRoi.delete();
        blurredRoi.delete();
        pipCircles.delete();
        
        return diceNumber;
        
    } catch (error) {
        console.error('Error detecting dice number:', error);
        return 0;
    }
}

// Alternative pip detection using contours with better filtering
function detectPipsUsingContours(blurredRoi, ctx, safeMinX, safeMinY, safeMaxX, safeMaxY, vertices) {
    let pips = [];
    
    try {
        // Use adaptive threshold for better contrast handling
        let thresholded = new cv.Mat();
        cv.adaptiveThreshold(blurredRoi, thresholded, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);
        
        // Morphological operations to clean up noise
        let kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
        cv.morphologyEx(thresholded, thresholded, cv.MORPH_OPEN, kernel);
        
        // Find contours
        let pipContours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(thresholded, pipContours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
        
        // Calculate dice center and area for normalization
        let centerX = (vertices[0].x + vertices[1].x + vertices[2].x + vertices[3].x) / 4;
        let centerY = (vertices[0].y + vertices[1].y + vertices[2].y + vertices[3].y) / 4;
        let diceWidth = Math.sqrt(Math.pow(vertices[1].x - vertices[0].x, 2) + Math.pow(vertices[1].y - vertices[0].y, 2));
        let diceHeight = Math.sqrt(Math.pow(vertices[2].x - vertices[1].x, 2) + Math.pow(vertices[2].y - vertices[1].y, 2));
        let diceArea = diceWidth * diceHeight;
        
        for (let i = 0; i < pipContours.size(); i++) {
            let contour = pipContours.get(i);
            let area = cv.contourArea(contour);
            
            // Filter by area relative to dice size (pips should be small relative to dice)
            let relativeArea = area / diceArea;
            if (relativeArea < 0.001 || relativeArea > 0.1) continue; // Too small or too large
            
            // Check circularity
            let perimeter = cv.arcLength(contour, true);
            let circularity = (4 * Math.PI * area) / (perimeter * perimeter);
            if (circularity < 0.6) continue; // Not circular enough
            
            let moments = cv.moments(contour);
            if (moments.m00 !== 0) {
                let x = moments.m10 / moments.m00;
                let y = moments.m01 / moments.m00;
                
                // Only count pips within safe zone (away from edges/corners)
                if (x >= safeMinX && x <= safeMaxX && y >= safeMinY && y <= safeMaxY) {
                    // Check distance from center (pips should not be too close to center for certain numbers)
                    let distanceFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                    let maxDistance = Math.min(diceWidth, diceHeight) * 0.4;
                    
                    if (distanceFromCenter <= maxDistance || pips.length < 2) {
                        pips.push({
                            x: x,
                            y: y,
                            area: area
                        });
                        
                        // Draw the pip with cyan color to distinguish from HoughCircles detection
                        ctx.beginPath();
                        ctx.arc(x, y, 6, 0, 2 * Math.PI);
                        ctx.lineWidth = 2;
                        ctx.strokeStyle = '#00ffff';
                        ctx.stroke();
                        
                        // Draw pip center
                        ctx.beginPath();
                        ctx.arc(x, y, 3, 0, 2 * Math.PI);
                        ctx.fillStyle = '#00ffff';
                        ctx.fill();
                    }
                }
            }
        }
        
        thresholded.delete();
        kernel.delete();
        pipContours.delete();
        hierarchy.delete();
        
    } catch (error) {
        console.error('Error in contour-based pip detection:', error);
    }
    
    return pips;
}

// Handle page unload - clean up camera
window.addEventListener('beforeunload', function() {
    stopProcessing();
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});

// Handle page visibility change - pause processing when not visible
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        stopProcessing();
    } else if (stream && opencvReady) {
        startProcessing();
    }
});