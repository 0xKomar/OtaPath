"use client";

/**
 * OtaDog — OtaPath's walking companion, ported from dog.html.
 * One SVG body, four CSS-driven states: static / walk / idle / win.
 * `flip` mirrors him (the art faces left by default) so he can head
 * east across the map. Class-based parts so many dogs can coexist.
 */

export type DogState = "static" | "walk" | "idle" | "win";

export function OtaDog({
  state = "idle",
  flip = false,
  size = 120,
  className = "",
}: {
  state?: DogState;
  flip?: boolean;
  /** rendered width in px (height follows the art's aspect) */
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="120 60 790 650"
      className={`otadog otadog-${state} ${className}`}
      style={{
        width: size,
        height: "auto",
        transform: flip ? "scaleX(-1)" : undefined,
      }}
      role="img"
      aria-label={`your dog, ${state}`}
    >
      {/* confetti + stars (only the win state shows it) */}
      <g className="dg-confetti">
        <polygon points="240,120 247,138 266,138 251,149 256,167 240,156 224,167 229,149 214,138 233,138" fill="#F4B43A" />
        <polygon points="560,95 565,108 579,108 568,116 572,129 560,121 548,129 552,116 541,108 555,108" fill="#F4B43A" />
        <polygon points="820,135 826,150 842,150 829,159 834,174 820,165 806,174 811,159 798,150 814,150" fill="#CE521A" />
        <rect x="330" y="75" width="16" height="8" rx="4" fill="#779662" transform="rotate(-25 330 75)" />
        <rect x="470" y="130" width="18" height="8" rx="4" fill="#CE521A" transform="rotate(35 470 130)" />
        <rect x="690" y="85" width="16" height="8" rx="4" fill="#779662" transform="rotate(20 690 85)" />
        <circle cx="190" cy="185" r="7" fill="#779662" />
        <circle cx="630" cy="145" r="6" fill="#F4B43A" />
        <circle cx="870" cy="210" r="8" fill="#779662" />
      </g>

      {/* ground shadow */}
      <line className="dg-shadow" x1="318" y1="684" x2="785" y2="684" stroke="#C5B6B0" strokeWidth="14" strokeLinecap="round" />

      <g className="dg-root">
        {/* back far leg (3rd from left) */}
        <path className="dg-back-far" d="M 605 495 C 605 478, 645 478, 645 495 L 645 518 C 647 544, 659 570, 687 588 C 709 602, 695 632, 675 622 C 635 602, 611 568, 605 518 Z" fill="#B64212" />

        {/* front far leg (1st from left) */}
        <path className="dg-front-far" d="M 345 465 C 355 450, 395 465, 385 485 L 385 505 C 355 522, 335 548, 336 584 C 336 610, 300 612, 296 588 C 290 542, 310 502, 342 475 Z" fill="#B64212" />

        {/* tail */}
        <g className="dg-tail">
          <path d="M 718 392 C 775 398, 818 385, 852 330 C 835 335, 822 334, 815 330 C 838 318, 852 302, 856 282 C 842 292, 830 296, 822 295 C 842 268, 848 238, 840 212 C 830 225, 820 232, 812 232 C 815 208, 800 194, 760 186 C 766 196, 768 204, 766 208 C 732 188, 692 188, 662 204 C 672 206, 680 210, 684 214 C 655 222, 640 236, 634 256 C 644 252, 654 250, 660 252 C 636 274, 628 302, 636 326 C 640 316, 644 310, 648 308 C 646 332, 654 348, 672 356 C 668 346, 668 338, 670 334 C 676 352, 686 362, 695 365 C 686 335, 692 310, 725 308 C 750 308, 755 335, 738 352 L 710 375 Z" fill="#ECC196" />
          <path d="M 692 315 C 688 288, 706 260, 738 258 C 775 256, 792 288, 785 322 C 792 316, 798 310, 802 302 C 806 322, 798 338, 784 348 C 790 348, 795 346, 799 343 C 792 362, 772 376, 745 380 L 725 345 C 744 346, 752 330, 742 316 C 730 302, 704 304, 692 315 Z" fill="#CE521A" />
        </g>

        {/* torso + neck + head */}
        <g className="dg-body">
          <path d="M 284 328 L 462 325 L 652 328 C 725 330, 772 380, 772 442 C 772 505, 722 548, 650 548 L 432 548 C 350 548, 292 495, 292 415 Z" fill="#CE521A" />
          <path d="M 286 332 L 292 422 C 294 468, 314 504, 348 525 C 374 492, 384 445, 378 392 L 378 328 Z" fill="#F8F3EC" />

          <g className="dg-head">
            <path d="M 288 168 L 296 86 C 297 80, 303 80, 307 85 L 355 152 Z" fill="#BC4413" />
            <path d="M 185 245 L 246 226 C 254 195, 266 172, 294 162 L 348 148 L 386 80 C 390 73, 398 74, 401 82 L 422 162 L 468 350 L 284 365 C 283 312, 272 306, 255 306 L 202 306 C 182 306, 174 292, 176 274 Z" fill="#CE521A" />
            <path d="M 176 274 C 175 294, 185 307, 206 307 L 258 307 C 276 307, 285 316, 286 362 L 378 348 L 378 305 C 378 272, 360 256, 326 256 L 198 260 Z" fill="#F8F3EC" />
            <path d="M 350 156 L 386 98 L 395 186 Z" fill="#ECC196" />
            <path d="M 282 232 C 284 214, 308 214, 311 232" fill="none" stroke="#3E281C" strokeWidth="8" strokeLinecap="round" />
            <path d="M 164 245 C 178 242, 198 243, 202 254 C 206 266, 192 281, 174 282 C 162 282, 156 268, 158 254 C 159 248, 161 246, 164 245 Z" fill="#3E281C" />
          </g>

          {/* collar */}
          <path d="M 284 352 C 345 344, 405 324, 460 296 C 465 294, 468 298, 470 304 L 473 316 C 474 320, 471 324, 466 326 C 410 355, 348 375, 286 382 C 281 382, 279 378, 279 373 L 279 359 C 279 355, 281 353, 284 352 Z" fill="#3E281C" />

          {/* tag */}
          <g className="dg-medal">
            <line x1="294" y1="378" x2="294" y2="394" stroke="#6E7A65" strokeWidth="4" strokeLinecap="round" />
            <circle cx="294" cy="408" r="17" fill="#779662" stroke="#5E794C" strokeWidth="1.5" />
          </g>
        </g>

        {/* front near leg (2nd from left) */}
        <path className="dg-front-near" d="M 380 472 C 380 455, 422 455, 422 472 L 422 486 C 424 525, 438 556, 470 576 C 492 590, 476 620, 456 610 C 412 588, 386 546, 380 486 Z" fill="#CE521A" />

        {/* back near leg (4th from left) */}
        <path className="dg-back-near" d="M 678 495 C 678 478, 718 478, 718 495 L 718 518 C 720 544, 732 570, 760 588 C 782 602, 768 632, 748 622 C 708 602, 684 568, 678 518 Z" fill="#CE521A" />
      </g>
    </svg>
  );
}
