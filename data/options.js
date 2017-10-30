'use strict';

module.exports =
{
	roomOptions :
	{
		mediaCodecs :
		[
			{
				kind        : 'audio',
				name        : 'opus',
				clockRate   : 48000,
                channels : 2,
                parameters :
				{
					useinbandfec : 1,
					minptime     : 10
				}
			},
			{
				kind       : 'video',
				name       : 'h264',
				clockRate  : 90000,
				parameters :
				{
					packetizationMode : 1
				}
			}
		]
	}
};
