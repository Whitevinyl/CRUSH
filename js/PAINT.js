function Paint(ctx,width,height,scale,col1,col2,col3,contrast,banding) {

    this.i = -1;
    this.j = 0;
    this.drawing = true;

    this.ctx = ctx;
    this.col1 = col1;
    this.col2 = col2;
    this.col3 = col3;


    this.thickness = 3;

    // generate texture //
    //noise.seed(Math.random());
    this.simplex = new SimplexNoise();
    this.height = Math.ceil(height);
    this.width = Math.ceil(width);


    this.contrast = contrast * 100;
    this.streakIndex = 0;
    this.rowOffset = 0;


    // make scale relative to canvas size //
    scale *= (Math.max(this.width,this.height)/(255 * ratio));


    this.scale = scale * 400;

    // perlin scales //
    this.heightX = this.scale * 1.5;
    this.heightY = this.scale * 2;
    this.wobbleX = this.scale / 2;
    this.wobbleY = this.scale / 1.5;
    this.driftY = this.scale * 1.6;
    this.colorY = this.scale * 2;
    this.mapDiv = this.scale * 1.1;
    this.mapDiv2 = this.scale * 1.4;
    this.mapDiv3 = this.scale * 0.8;
    this.ridgeMult = this.scale * 0.002;
    this.ridgeMult2 = this.scale * 0.02;
    this.ridgeMult3 = this.scale * 0.1;
    this.ridgeScale = 0.1;
    this.mapScale = 1;

    this.feedback = tombola.range(1,4);
    /*this.feedbackShift = [];
    for (var i=0; i<this.feedback; i++) {
        this.feedbackShift.push(tombola.percent(50));
    }
    console.log(this.feedbackShift);*/

    var dl = tombola.range(250, 350);
    this.ridgeDataLength = dl;
    this.ridgeData = [];
    var jump = 1.5;
    var rd = tombola.rangeFloat(-1, 1);
    var peak = 0;
    for (var i=0; i<=this.ridgeDataLength; i++) {
        rd += tombola.fudgeFloat(30, 0.01); // jitter
        if (tombola.percent(6)) rd += tombola.moveFloat(jump/3, jump); // jump
        rd = valueInRange(rd, -1, 1);
        this.ridgeData.push( rd );
        if (Math.abs(rd) > peak) peak = Math.abs(rd);
    }

    /*var norm = 1/peak;
    for (var i=0; i<=this.ridgeDataLength; i++) {
        this.ridgeData[i] *= norm;
    }*/

    this._newRow();
}

function mix(a, b, level) {
    return (a * (1-level)) + (b * level);
}

Paint.prototype.draw = function(speed) {

    // if there are rows to be drawn //
    if (this.i < this.height) {
        var ctx = this.ctx;

        var s = this.scale;

        // loop through rows * speed //
        var l = this.width * speed;
        for (var h=0; h<l; h++) {

            // perlin noise offset //
            var n = this.simplex.noise(this.j / (1.1 * s), 3000 + (this.i / (1.1 * s)));
            //n = mix(n, this.simplex.noise(3000 + (this.j / (1.0 * s)), this.i / (1.0 * s)), 0.02);
            n = mix(n, this.simplex.noise(6000 + (this.j / (20 * s)), 6000 + (this.i / (0.25 * s))), 0.025);
            n = mix(n, this.simplex.noise(6000 + (this.j / (0.25 * s)), 6000 + (this.i / (20 * s))), 0.025);
            n = mix(n, this.simplex.noise(120000 + (this.j / (30 * s)), 120000 + (this.i / (0.2 * s))), 0.025);
            n = mix(n, this.simplex.noise(120000 + (this.j / (0.2 * s)), 120000 + (this.i / (30 * s))), 0.025);
            n = mix(n, this.simplex.noise(500000 + (this.j / (50 * s)), 500000 + (this.i / (0.3 * s))), 0.025);
            n = mix(n, this.simplex.noise(500000 + (this.j / (0.3 * s)), 500000 + (this.i / (50 * s))), 0.025);
            //n = mix(n, this.simplex.noise(this.j / (0.15 * s), 9000 + (this.i / (0.15 * s))), 0.02);
            n = mix(n, this.simplex.noise(9000 + (this.j / (0.08 * s)), this.i / (0.09 * s)), 0.0075);
            //n = mix(n, this.simplex.noise(this.j / (0.01 * s), 12000 + (this.i / (0.01 * s))), 0.0004);



            var alt = n;
            n = mix(n, this.ridgeData[Math.round((alt + 1) * (this.ridgeDataLength/2))], 0.5);
            n = mix(n, this.simplex.noise(10000 + (this.j / (1.35 * s)), this.i / (1.35 * s)), 0.7);

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

            // add noise to color //
            if (addNoise) {
                var noiseLvl = tombola.rangeFloat(-this.noiseLevel,this.noiseLevel);
                fillCol.R += noiseLvl;
                fillCol.G += noiseLvl;
                fillCol.B += noiseLvl;
            }


            // draw //
            color.fill(ctx, fillCol );
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
