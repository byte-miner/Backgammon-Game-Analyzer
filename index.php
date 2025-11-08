<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Backgammon Checker & Dice Detection Demo</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
            color: #ffffff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            touch-action: manipulation;
        }

        .container {
            width: 100%;
            max-width: 1200px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
        }

        h1 {
            font-size: 2.5rem;
            text-align: center;
            margin: 20px 0;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }

        .video-container {
            position: relative;
            width: 100%;
            max-width: 640px;
            background: #000;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        #videoElement {
            width: 100%;
            height: auto;
            display: block;
            transform: rotateY(180deg); /* Mirror effect for front camera */
        }

        #canvasOutput {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: none;
        }

        .controls {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: center;
        }

        button {
            padding: 12px 24px;
            font-size: 1rem;
            font-weight: 600;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #4a90e2;
            color: white;
            min-height: 44px; /* Better touch target */
            min-width: 120px;
        }

        button:hover {
            background: #357abd;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4);
        }

        button:active {
            transform: translateY(0);
        }

        button:disabled {
            background: #666;
            cursor: not-allowed;
            transform: none;
        }

        .status {
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 5px;
            text-align: center;
            min-width: 200px;
        }

        .camera-switch {
            display: none; /* Hidden by default, shown on mobile */
            margin-top: 10px;
        }

        .legend {
            display: flex;
            gap: 20px;
            margin-top: 10px;
            flex-wrap: wrap;
            justify-content: center;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
        }

        .legend-color {
            width: 20px;
            height: 20px;
            border-radius: 3px;
        }

        @media (max-width: 768px) {
            h1 {
                font-size: 1.8rem;
            }

            button {
                padding: 14px 20px; /* Larger touch targets on mobile */
                font-size: 1rem;
            }

            .camera-switch {
                display: block;
            }

            .video-container {
                max-width: 100%;
            }
        }

        /* Loading indicator */
        .loading {
            display: none;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 1.2rem;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Backgammon Checker & Dice Detection Demo</h1>
        
        <div class="video-container">
            <video id="videoElement" autoplay playsinline></video>
            <canvas id="canvasOutput"></canvas>
            <div class="loading" id="loadingIndicator">Loading OpenCV...</div>
        </div>

        <div class="controls">
            <button id="startButton">Start Camera</button>
            <button id="stopButton" disabled>Stop Camera</button>
        </div>

        <div class="camera-switch">
            <button id="switchCameraButton">Switch Camera</button>
        </div>

        <div class="status" id="statusText">
            Click "Start Camera" to begin
        </div>

        <div class="legend">
            <div class="legend-item">
                <div class="legend-color" style="background-color: #00ff00;"></div>
                <span>Checkers (Circles)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #ff00ff;"></div>
                <span>Dice (Squares)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #ffff00;"></div>
                <span>Dice Pips (Dots)</span>
            </div>
        </div>
    </div>

    <script async src="https://docs.opencv.org/4.x/opencv.js" type="text/javascript"></script>
    
    <!-- Application script -->
    <script src="js/app.js"></script>
</body>
</html>