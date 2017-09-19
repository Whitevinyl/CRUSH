
function Paint(ctx,width,height,scale,col1,col2,col3,contrast,banding) {

    this.i = -1;
    this.j = 0;
    this.drawing = true;

    this.ctx = ctx;
    this.col1 = col1;
    this.col2 = col2;
    this.col3 = col3;


    // generate texture //
    this.thickness = 1;
    this.simplex = new SimplexNoise();
    this.height = Math.ceil(height);
    this.width = Math.ceil(width);
    this.contrast = contrast * 100;


    // make scale relative to canvas size //
    scale *= (Math.max(this.width,this.height)/(255 * ratio));
    this.scale = scale * 400;

    // perlin scales //
    this.mapScale = 1.1 * this.scale;
    this.s1a = 20 * this.scale;
    this.s1b = 0.25 * this.scale;
    this.s2a = 30 * this.scale;
    this.s2b = 0.2 * this.scale;
    this.s3a = 50 * this.scale;
    this.s3b = 0.3 * this.scale;
    this.wiggle = 0.08 * this.scale;
    this.undulate = 1.35 * this.scale;

    // ridge data & feedback //
    this.feedback = tombola.range(1,4);
    var dl = tombola.range(250, 350);
    this.ridgeDataLength = dl;
    this.ridgeData = [];
    var jump = 1.5;
    var rd = tombola.rangeFloat(-1, 1);
    for (var i=0; i<=this.ridgeDataLength; i++) {
        rd += tombola.fudgeFloat(30, 0.01); // jitter
        if (tombola.percent(6)) rd += tombola.moveFloat(jump/3, jump); // jump
        rd = valueInRange(rd, -1, 1);
        this.ridgeData.push( rd );
    }

    this._newRow();
}

function mix(a, b, level) {
    return (a * (1-level)) + (b * level);
}

Paint.prototype.draw = function(speed) {

    // if there are rows to be drawn //
    if (this.i < this.height) {
        var ctx = this.ctx;

        // loop through rows * speed //
        var l = this.width * speed;
        for (var h=0; h<l; h++) {

            // perlin noise offset //
            var n = this.simplex.noise(this.j / this.mapScale, 3000 + (this.i / this.mapScale));
            n = mix(n, this.simplex.noise(6000 + (this.j / this.s1a), 6000 + (this.i / this.s1b)), 0.025);
            n = mix(n, this.simplex.noise(6000 + (this.j / this.s1b), 6000 + (this.i / this.s1a)), 0.025);
            n = mix(n, this.simplex.noise(120000 + (this.j / this.s2a), 120000 + (this.i / this.s2b)), 0.025);
            n = mix(n, this.simplex.noise(120000 + (this.j / this.s2b), 120000 + (this.i / this.s2a)), 0.025);
            n = mix(n, this.simplex.noise(500000 + (this.j / this.s3a), 500000 + (this.i / this.s3b)), 0.025);
            n = mix(n, this.simplex.noise(500000 + (this.j / this.s3b), 500000 + (this.i / this.s3a)), 0.025);
            n = mix(n, this.simplex.noise(9000 + (this.j / this.wiggle), this.i / this.wiggle), 0.0075);


            // map to ridgeData //
            var alt = n;
            n = mix(n, this.ridgeData[Math.round((alt + 1) * (this.ridgeDataLength/2))], 0.5);
            n = mix(n, this.simplex.noise(10000 + (this.j / this.undulate), this.i / this.undulate), 0.7);


            // feedback into ridgedata //
            for (var k=0; k<this.feedback; k++) {
                /*if (this.feedbackShift[k]) {
                    n = mix(n, this.simplex.noise((k * 20000) + (this.j / (1.35 * s)), this.i / (1.35 * s)), 0.2);
                }*/
                n = mix(n, this.ridgeData[Math.round((n + 1) * (this.ridgeDataLength/2))], 1);
            }


            // color value & contrast //
            n += (Math.sign(n) * 0.01 * this.contrast);
            n = (n + 1) / 2; // normalise to range 0 - 1;

            // set blended fill color //
            var fillCol;
            if (n > 0.5) {
                n = (n - 0.5) * 2;
                fillCol = color.blend2(this.col2, this.col3, n * 100);
            } else {
                n *= 2;
                fillCol = color.blend2(this.col1, this.col2, n * 100);
            }


            // draw //
            color.fill(ctx, fillCol);
            ctx.fillRect(this.j,this.i, 1, this.thickness);

            // done //
            this._proceed();
        }

    } else if (this.drawing) {
        this.drawing = false;
        setTimeout(function(){
            resetPaint();
        },1400);
    }
};

Paint.prototype._proceed = function() {
    this.j ++;
    if (this.j >= this.width) {
        this._newRow();
    }
}

Paint.prototype._newRow = function() {
    this.i ++;
    this.j = 0;
};
