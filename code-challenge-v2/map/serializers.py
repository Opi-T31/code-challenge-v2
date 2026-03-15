from rest_framework import serializers
from map.models import CommunityArea, RestaurantPermit


class CommunityAreaSerializer(serializers.ModelSerializer):

    class Meta:
        model = CommunityArea
        fields = ["name", "num_permits"]

    # This allows us to calculate num_permits dynamically
    num_permits = serializers.SerializerMethodField()

    def get_num_permits(self, obj):
        """
        Supplement each community area with the number of permits issued
        in that area during the given year. The view passes the year via context
        (e.g. /map-data/?year=2017).
        """
        year = self.context.get("year")
        if year is None:
            return 0

        # community_area_id is CharField; match using string form of area_id
        permit_count = RestaurantPermit.objects.filter(
            community_area_id=str(obj.area_id),
            issue_date__year=year,
        ).count()
        return permit_count
